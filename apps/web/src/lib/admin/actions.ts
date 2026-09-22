'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ehAdmin } from '@/lib/admin/guarda';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { lerNumeroBR, numeroComZero } from '@/lib/numeros';

/**
 * Edição de planos e limites (seções 2 e 23).
 *
 * É aqui que a promessa de "nada hardcoded na interface" se paga: mudar o
 * limite de histórico ou liberar a exportação no plano grátis é uma edição
 * nesta tela, sem deploy.
 *
 * A checagem de admin é feita de novo no servidor — a portaria do layout
 * protege a navegação, não a Server Action, que é um endpoint como outro
 * qualquer.
 */

const planoSchema = z.object({
  plan_id: z.string().uuid(),
  name: z.string().trim().min(1, 'O plano precisa de um nome.').max(40),
  description: z.string().trim().max(160).optional(),
  price_monthly: numeroComZero('Preço mensal inválido.'),
  price_yearly: numeroComZero('Preço anual inválido.'),
  trial_days: numeroComZero('Dias de teste inválidos.'),
});

export async function salvarPlano(_estado: FormState, formData: FormData): Promise<FormState> {
  if (!(await ehAdmin())) return { erro: 'Acesso restrito.' };

  const parsed = planoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from('plans')
    .update({
      name: d.name,
      description: d.description || null,
      price_monthly: d.price_monthly,
      price_yearly: d.price_yearly,
      trial_days: Math.round(d.trial_days),
    })
    .eq('id', d.plan_id);

  if (error) return { erro: 'Não foi possível salvar o plano.' };

  // A landing e o app leem planos e limites a cada carga; revalidar aqui faz
  // a mudança aparecer na hora, sem esperar cache expirar.
  revalidatePath('/');
  revalidatePath('/admin/planos');
  return { sucesso: 'Plano salvo.' };
}

/**
 * Salva os limites de um plano.
 *
 * Os campos chegam como `enabled_<feature>` e `limite_<feature>`. Limite em
 * branco significa ILIMITADO, não zero — é a diferença entre "histórico
 * completo" e "nenhum histórico".
 */
export async function salvarLimites(_estado: FormState, formData: FormData): Promise<FormState> {
  if (!(await ehAdmin())) return { erro: 'Acesso restrito.' };

  const planId = String(formData.get('plan_id') ?? '');
  if (!z.string().uuid().safeParse(planId).success) return { erro: 'Plano inválido.' };

  const supabase = await createClient();

  const { data: atuais } = await supabase
    .from('plan_entitlements')
    .select('id, feature_key')
    .eq('plan_id', planId);

  if (!atuais || atuais.length === 0) return { erro: 'Plano sem limites cadastrados.' };

  const erros: string[] = [];

  for (const item of atuais) {
    const enabled = formData.get(`enabled_${item.feature_key}`) === 'on';
    const bruto = String(formData.get(`limite_${item.feature_key}`) ?? '').trim();

    let limite: number | null = null;
    if (bruto !== '') {
      const n = lerNumeroBR(bruto);
      if (!Number.isFinite(n) || n < 0) {
        erros.push(item.feature_key);
        continue;
      }
      limite = n;
    }

    const { error } = await supabase
      .from('plan_entitlements')
      .update({ enabled, limit_value: limite })
      .eq('id', item.id);

    if (error) erros.push(item.feature_key);
  }

  if (erros.length > 0) {
    return { erro: `Não foi possível salvar: ${erros.join(', ')}.` };
  }

  revalidatePath('/');
  revalidatePath('/admin/planos');
  return { sucesso: 'Limites salvos. Valem para todos os usuários do plano a partir de agora.' };
}
