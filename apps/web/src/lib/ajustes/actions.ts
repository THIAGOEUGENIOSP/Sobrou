'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validarPercentuais } from '@kmlegal/finance';
import { createClient, requireUser } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import { can } from '@/lib/entitlements';
import { CHAVES_CARDS } from './cards';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { lerNumeroBR } from '@/lib/numeros';

const ajustesSchema = z.object({
  fuel_price_mode: z.enum(['ultimo', 'media_ponderada_30d']),
  cashback_reduces_cost: z.string().optional(),
  ride_cost_basis: z.enum(['total', 'combustivel']),
});

export async function salvarAjustes(_estado: FormState, formData: FormData): Promise<FormState> {
  const parsed = ajustesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();

  // Os cards escolhidos só valem se o plano permitir personalizar o dashboard.
  const cards = formData.getAll('cards').filter((c): c is string => typeof c === 'string');
  const podePersonalizar = await can('dashboard_custom');

  const atualizacao: TablesUpdate<'user_settings'> = {
    fuel_price_mode: parsed.data.fuel_price_mode,
    cashback_reduces_cost: parsed.data.cashback_reduces_cost === 'on',
    ride_cost_basis: parsed.data.ride_cost_basis,
  };

  if (podePersonalizar) {
    const validos = cards.filter((c) => CHAVES_CARDS.includes(c));
    if (validos.length === 0) {
      return { erro: 'Escolha ao menos um card para o dashboard.' };
    }
    atualizacao.dashboard_cards = validos;
  }

  const { error } = await supabase
    .from('user_settings')
    .update(atualizacao)
    .eq('user_id', user.id);

  if (error) return { erro: 'Não foi possível salvar os ajustes.' };

  revalidatePath('/app');
  revalidatePath('/app/ajustes');

  return {
    sucesso: podePersonalizar
      ? 'Ajustes salvos.'
      : 'Ajustes salvos. Os cards do dashboard fazem parte do plano Premium.',
  };
}

/**
 * Novos percentuais de distribuição.
 *
 * Cria uma VERSÃO nova em vez de editar a atual: os turnos já fechados
 * continuam apontando para os percentuais que usaram, e o passado não muda.
 */
export async function salvarPercentuais(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const config = {
    pctDisponivel: lerNumeroBR(String(formData.get('pct_disponivel') ?? '')),
    pctEmergencia: lerNumeroBR(String(formData.get('pct_emergencia') ?? '')),
    pctVeiculo: lerNumeroBR(String(formData.get('pct_veiculo') ?? '')),
  };

  const validacao = validarPercentuais(config);
  if (!validacao.valido) return { erro: validacao.erros.join(' ') };

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('allocation_configs').insert({
    user_id: user.id,
    pct_disponivel: config.pctDisponivel,
    pct_emergencia: config.pctEmergencia,
    pct_veiculo: config.pctVeiculo,
  });

  if (error) return { erro: 'Não foi possível salvar os percentuais.' };

  revalidatePath('/app');
  revalidatePath('/app/ajustes');

  return {
    sucesso:
      'Percentuais atualizados. Valem dos próximos turnos em diante; os dias já fechados ficam como estavam.',
  };
}
