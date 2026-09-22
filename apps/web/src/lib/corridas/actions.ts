'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { avaliarCorrida, type RideEvaluation, type RideRules } from '@kmlegal/finance';
import { createClient, requireUser } from '@/lib/supabase/server';
import { PlanoInsuficienteError, requireFeature } from '@/lib/entitlements';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { numeroObrigatorio, numeroOpcional } from '@/lib/numeros';

/**
 * Analisador de corridas (seção 11) — o núcleo do KM Legal.
 *
 * A avaliação roda no cliente enquanto o motorista digita, porque ele precisa
 * da resposta em três segundos, antes de a corrida expirar. O servidor
 * recalcula com a MESMA função ao registrar, para o histórico guardar o
 * veredito de verdade e não o que o cliente disse que era.
 */

const regrasSchema = z.object({
  valor_min: numeroOpcional('Valor mínimo inválido.'),
  rs_km_min: numeroOpcional('R$/km mínimo inválido.'),
  rs_hora_min: numeroOpcional('R$/hora mínimo inválido.'),
  dist_max_busca: numeroOpcional('Distância máxima inválida.'),
  nota_min: numeroOpcional('Nota mínima inválida.'),
  margem_min: numeroOpcional('Margem mínima inválida.'),
});

export async function salvarRegras(_estado: FormState, formData: FormData): Promise<FormState> {
  const parsed = regrasSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  try {
    await requireFeature('ride_analyzer');
  } catch (e) {
    if (e instanceof PlanoInsuficienteError) {
      return { erro: 'O analisador de corridas faz parte do plano Premium.' };
    }
    throw e;
  }

  if (parsed.data.nota_min !== null && parsed.data.nota_min > 5) {
    return { campos: { nota_min: 'A nota vai até 5,0.' }, erro: 'Confira os campos destacados.' };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from('ride_rules')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  const valores = {
    valor_min: parsed.data.valor_min,
    rs_km_min: parsed.data.rs_km_min,
    rs_hora_min: parsed.data.rs_hora_min,
    dist_max_busca: parsed.data.dist_max_busca,
    nota_min: parsed.data.nota_min,
    margem_min: parsed.data.margem_min,
  };

  const { error } = existente
    ? await supabase.from('ride_rules').update(valores).eq('id', existente.id)
    : await supabase.from('ride_rules').insert({ user_id: user.id, ...valores });

  if (error) return { erro: 'Não foi possível salvar as regras.' };

  revalidatePath('/app/corrida');
  return { sucesso: 'Regras salvas. Valem a partir da próxima avaliação.' };
}

const avaliacaoSchema = z.object({
  valor: numeroObrigatorio('Informe o valor da corrida.'),
  km_busca: numeroOpcional('KM até o passageiro inválido.'),
  km_viagem: numeroObrigatorio('Informe os km da viagem.'),
  min_busca: numeroOpcional('Tempo até o passageiro inválido.'),
  min_viagem: numeroOpcional('Tempo da viagem inválido.'),
  nota_passageiro: numeroOpcional('Nota inválida.'),
  regiao_destino: z.string().trim().max(60).optional(),
  categoria: z.string().trim().max(40).optional(),
  aceita: z.string().optional(),
  custo_por_km: numeroOpcional('Custo por km inválido.'),
});

/**
 * Registra a corrida avaliada.
 *
 * O veredito gravado é o que o servidor calcula, com as regras que estão no
 * banco agora — não o que veio no formulário. Confiar no cliente aqui deixaria
 * o histórico de decisões sem valor nenhum.
 */
export async function registrarAvaliacao(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = avaliacaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();

  const { data: regras } = await supabase
    .from('ride_rules')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  const { data: turnoAberto } = await supabase
    .from('shifts')
    .select('id')
    .eq('status', 'aberto')
    .maybeSingle();

  const d = parsed.data;

  const avaliacao: RideEvaluation = avaliarCorrida(
    {
      valor: d.valor,
      kmBusca: d.km_busca ?? 0,
      kmViagem: d.km_viagem,
      minBusca: d.min_busca ?? 0,
      minViagem: d.min_viagem ?? 0,
      notaPassageiro: d.nota_passageiro,
    },
    regras
      ? ({
          valorMin: regras.valor_min,
          rsKmMin: regras.rs_km_min,
          rsHoraMin: regras.rs_hora_min,
          distMaxBusca: regras.dist_max_busca,
          notaMin: regras.nota_min,
          margemMin: regras.margem_min,
        } satisfies RideRules)
      : {},
    d.custo_por_km,
  );

  const { error } = await supabase.from('ride_evaluations').insert({
    user_id: user.id,
    shift_id: turnoAberto?.id ?? null,
    valor: d.valor,
    km_busca: d.km_busca ?? 0,
    km_viagem: d.km_viagem,
    min_busca: d.min_busca ?? 0,
    min_viagem: d.min_viagem ?? 0,
    nota_passageiro: d.nota_passageiro,
    regiao_destino: d.regiao_destino || null,
    categoria: d.categoria || null,
    rs_km: avaliacao.rsKm,
    rs_hora: avaliacao.rsHora,
    custo_estimado: avaliacao.custoEstimado,
    margem_estimada: avaliacao.margemEstimada,
    veredito: avaliacao.veredito === 'indefinido' ? null : avaliacao.veredito,
    motivos: avaliacao.motivos,
    aceita: d.aceita === 'on',
  });

  if (error) return { erro: 'Não foi possível registrar a corrida.' };

  await supabase.from('app_events').insert({ user_id: user.id, event_key: 'corrida_avaliada' });

  revalidatePath('/app/corrida');
  redirect('/app/corrida?registrada=1');
}
