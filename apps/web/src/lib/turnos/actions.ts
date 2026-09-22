'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fecharTurno, type ShiftRevenue } from '@sobrou/finance';
import { createClient, requireUser } from '@/lib/supabase/server';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { dataLocal, numeroComZero, numeroObrigatorio, numeroOpcional } from '@/lib/numeros';

/**
 * Turno: iniciar, lançar despesa no meio e fechar o dia (seções 4, 6, 7 e 12).
 *
 * O turno vive no servidor, não no celular: se o aparelho morrer ou o app
 * fechar, o turno aberto continua lá quando o motorista voltar.
 */

const iniciarSchema = z.object({
  vehicle_id: z.string().uuid('Escolha o veículo.'),
  odo_inicial: numeroObrigatorio('Informe o hodômetro de início.'),
});

export async function iniciarTurno(_estado: FormState, formData: FormData): Promise<FormState> {
  const parsed = iniciarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const ctx = await carregarContexto();

  const agora = new Date();
  const { error } = await supabase.from('shifts').insert({
    user_id: user.id,
    vehicle_id: parsed.data.vehicle_id,
    status: 'aberto',
    // Turno que vira a meia-noite conta para o dia em que começou.
    work_date: dataLocal(agora, ctx.timezone),
    started_at: agora.toISOString(),
    odo_inicial: parsed.data.odo_inicial,
  });

  if (error) {
    // O índice único parcial garante um turno aberto por usuário.
    if (error.code === '23505') {
      return { erro: 'Você já tem um turno aberto. Finalize ele antes de começar outro.' };
    }
    return { erro: 'Não foi possível iniciar o turno. Tente novamente.' };
  }

  await supabase.from('app_events').insert({ user_id: user.id, event_key: 'turno_iniciado' });

  revalidatePath('/app');
  redirect('/app/turno');
}

export async function cancelarTurno(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  // Só apaga turno ainda aberto: turno fechado tem snapshot e reserva ligados.
  await supabase.from('shifts').delete().eq('id', id).eq('status', 'aberto');

  revalidatePath('/app');
  redirect('/app');
}

// ---------------------------------------------------------------------------

const despesaSchema = z.object({
  category_id: z.string().uuid('Escolha a categoria.'),
  valor: numeroObrigatorio('Informe o valor.'),
  description: z.string().trim().max(120).optional(),
  shift_id: z.string().uuid().optional().or(z.literal('')),
  vehicle_id: z.string().uuid().optional().or(z.literal('')),
});

/** Lançamento avulso: despesa do turno, ou receita/despesa fora dele. */
export async function lancarTransacao(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = despesaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const ctx = await carregarContexto();
  const agora = new Date();

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    category_id: parsed.data.category_id,
    // `kind` é preenchido pelo trigger a partir da categoria: a aplicação não
    // decide se é receita ou despesa, quem decide é o cadastro da categoria.
    kind: 'despesa',
    shift_id: parsed.data.shift_id || null,
    vehicle_id: parsed.data.vehicle_id || ctx.veiculo?.id || null,
    occurred_at: agora.toISOString(),
    work_date: dataLocal(agora, ctx.timezone),
    valor: parsed.data.valor,
    description: parsed.data.description || null,
  });

  if (error) return { erro: 'Não foi possível salvar o lançamento.' };

  revalidatePath('/app');
  revalidatePath('/app/turno');

  redirect(parsed.data.shift_id ? '/app/turno' : '/app');
}

export async function excluirTransacao(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  await supabase.from('transactions').delete().eq('id', id);

  revalidatePath('/app');
  revalidatePath('/app/turno');
}

// ---------------------------------------------------------------------------

const fecharSchema = z.object({
  shift_id: z.string().uuid(),
  odo_final: numeroObrigatorio('Informe o hodômetro final.'),
  qtd_corridas: numeroOpcional('Quantidade de corridas inválida.'),
  custo_combustivel_real: numeroOpcional('Valor de combustível inválido.'),
});

/**
 * Fecha o turno (seção 12).
 *
 * Toda a matemática sai de `fecharTurno` do pacote de fórmulas — a rota não
 * calcula nada por conta própria. O resultado vira snapshot: alterar consumo
 * ou percentuais amanhã não reescreve este dia.
 */
export async function finalizarTurno(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const bruto = Object.fromEntries(formData);
  const parsed = fecharSchema.safeParse(bruto);
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const ctx = await carregarContexto();

  const { data: turno } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', parsed.data.shift_id)
    .maybeSingle();

  if (!turno) return { erro: 'Turno não encontrado.' };

  // Todo usuário ganha uma configuração de percentuais no cadastro, então
  // isto não deveria acontecer. Se acontecer, parar é melhor que fechar: o
  // turno guardaria o resultado sem registrar QUAIS percentuais o produziram,
  // e é justamente esse ponteiro que impede o passado de ser reescrito quando
  // o motorista mudar a divisão amanhã.
  if (!ctx.allocationId) {
    return { erro: 'Configure a divisão do resultado em Ajustes antes de fechar o turno.' };
  }

  if (parsed.data.odo_final < Number(turno.odo_inicial)) {
    return {
      campos: { odo_final: 'O hodômetro final não pode ser menor que o de início.' },
      erro: 'Confira os campos destacados.',
    };
  }

  // Faturamento por plataforma: campos chamados "receita_<categoria>".
  const receitas: ShiftRevenue[] = [];
  const receitasParaBanco: Array<{ category_id: string; valor: number; qtd_corridas: number | null }> = [];

  for (const [chave, valor] of Object.entries(bruto)) {
    if (!chave.startsWith('receita_') || typeof valor !== 'string') continue;
    const categoryId = chave.slice('receita_'.length);
    const parseado = numeroComZero('valor inválido').safeParse(valor);
    if (!parseado.success || parseado.data <= 0) continue;

    receitas.push({ categoryId, valor: parseado.data });
    receitasParaBanco.push({ category_id: categoryId, valor: parseado.data, qtd_corridas: null });
  }

  if (receitas.length === 0) {
    return { erro: 'Informe quanto você faturou em pelo menos uma plataforma.' };
  }

  // A quantidade de corridas é do dia, não por plataforma: fica na primeira.
  if (parsed.data.qtd_corridas !== null && receitasParaBanco[0]) {
    receitasParaBanco[0].qtd_corridas = Math.round(parsed.data.qtd_corridas);
    receitas[0]!.qtdCorridas = Math.round(parsed.data.qtd_corridas);
  }

  // Despesas já lançadas dentro do turno.
  const { data: despesas } = await supabase
    .from('transactions')
    .select('valor, kind')
    .eq('shift_id', turno.id)
    .eq('kind', 'despesa');

  const parametros = parametrosDoTurno(ctx, {
    ...(turno.fuel_kind_usado ? { fuelKind: turno.fuel_kind_usado } : {}),
  });

  const fim = new Date();

  const fechamento = fecharTurno(
    {
      startedAt: turno.started_at,
      endedAt: fim.toISOString(),
      odoInicial: Number(turno.odo_inicial),
      odoFinal: parsed.data.odo_final,
      consumo: Number(turno.consumo_usado ?? parametros.consumo),
      precoCombustivel: Number(turno.preco_combustivel_usado ?? parametros.preco),
      fuelKind: parametros.fuelKind,
      receitas,
      despesas: (despesas ?? []).map((d) => Number(d.valor)),
      custoCombustivelReal: parsed.data.custo_combustivel_real,
    },
    ctx.allocation,
  );

  const { error } = await supabase.rpc('fechar_turno', {
    p_shift_id: turno.id,
    p_ended_at: fim.toISOString(),
    p_odo_final: parsed.data.odo_final,
    p_consumo: Number(turno.consumo_usado ?? parametros.consumo),
    p_preco_combustivel: Number(turno.preco_combustivel_usado ?? parametros.preco),
    p_fuel_kind: parametros.fuelKind,
    p_allocation_config_id: ctx.allocationId,
    p_snapshot: {
      km: fechamento.snapshot.km,
      horas: fechamento.snapshot.horas,
      litros: fechamento.snapshot.litros,
      faturamento: fechamento.snapshot.faturamento,
      custo_combustivel: fechamento.snapshot.custoCombustivel,
      outras_despesas: fechamento.snapshot.outrasDespesas,
      resultado_op: fechamento.snapshot.resultadoOperacional,
      reserva_veiculo: fechamento.snapshot.reservaVeiculo,
      reserva_emerg: fechamento.snapshot.reservaEmergencia,
      disponivel: fechamento.snapshot.disponivel,
    },
    p_receitas: receitasParaBanco,
    p_creditos: fechamento.creditosReserva.map((c) => ({
      reserve_kind: c.reserveKind,
      valor: c.valor,
    })),
  });

  if (error) return { erro: 'Não foi possível fechar o turno. Tente novamente.' };

  // Hodômetro do carro segue o turno.
  await supabase
    .from('vehicles')
    .update({ odometro_atual: parsed.data.odo_final })
    .eq('id', turno.vehicle_id);

  await supabase.from('app_events').insert({ user_id: user.id, event_key: 'turno_fechado' });

  revalidatePath('/app');
  redirect(`/app/turno/${turno.id}`);
}
