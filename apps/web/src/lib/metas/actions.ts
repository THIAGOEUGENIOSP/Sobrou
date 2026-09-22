'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';
import { requireFeature, PlanoInsuficienteError } from '@/lib/entitlements';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { numeroObrigatorio } from '@/lib/numeros';

const metaSchema = z.object({
  kind: z.enum([
    'fat_diaria',
    'fat_semanal',
    'fat_mensal',
    'liquido_mensal',
    'rs_km_min',
    'rs_h_min',
    'reserva_emerg',
    'reserva_veic',
  ]),
  target_value: numeroObrigatorio('Informe o valor da meta.'),
});

export async function salvarMeta(_estado: FormState, formData: FormData): Promise<FormState> {
  const parsed = metaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  try {
    await requireFeature('goals');
  } catch (e) {
    if (e instanceof PlanoInsuficienteError) {
      return { erro: 'As metas fazem parte do plano Premium.' };
    }
    throw e;
  }

  const user = await requireUser();
  const supabase = await createClient();

  // Um índice único garante uma meta ativa por tipo. Salvar de novo substitui
  // o alvo em vez de criar uma segunda meta do mesmo tipo.
  const { data: existente } = await supabase
    .from('goals')
    .select('id')
    .eq('kind', parsed.data.kind)
    .eq('is_active', true)
    .maybeSingle();

  const { error } = existente
    ? await supabase
        .from('goals')
        .update({ target_value: parsed.data.target_value })
        .eq('id', existente.id)
    : await supabase.from('goals').insert({
        user_id: user.id,
        kind: parsed.data.kind,
        target_value: parsed.data.target_value,
      });

  if (error) return { erro: 'Não foi possível salvar a meta.' };

  revalidatePath('/app');
  revalidatePath('/app/metas');
  return { sucesso: 'Meta salva.' };
}

export async function removerMeta(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  // Desativa em vez de apagar: o histórico de metas é informação útil.
  await supabase.from('goals').update({ is_active: false }).eq('id', id);

  revalidatePath('/app');
  revalidatePath('/app/metas');
}
