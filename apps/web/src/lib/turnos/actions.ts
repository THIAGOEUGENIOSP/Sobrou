'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fecharTurno, segundosTrabalhados, type ShiftRevenue } from '@sobrou/finance';
import { createClient, requireUser } from '@/lib/supabase/server';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { dataLocal, formatarValorParaUrl, numeroObrigatorio, numeroOpcional } from '@/lib/numeros';

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

/** Pausa o turno aberto: marca o instante, para o cronômetro descontar depois. */
export async function pausarTurno(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from('shifts')
    .update({ paused_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'aberto')
    .is('paused_at', null);

  revalidatePath('/app/turno');
}

/** Retoma um turno pausado: soma o tempo pausado ao acumulado e limpa a marca. */
export async function retomarTurno(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  const { data: turno } = await supabase
    .from('shifts')
    .select('paused_at, paused_seconds')
    .eq('id', id)
    .maybeSingle();

  if (!turno?.paused_at) return;

  const segundosPausa = Math.max(
    0,
    Math.round((Date.now() - new Date(turno.paused_at).getTime()) / 1000),
  );

  await supabase
    .from('shifts')
    .update({
      paused_at: null,
      paused_seconds: Number(turno.paused_seconds ?? 0) + segundosPausa,
    })
    .eq('id', id);

  revalidatePath('/app/turno');
}

// ---------------------------------------------------------------------------

const ganhoSchema = z.object({
  shift_id: z.string().uuid(),
  category_id: z.string().uuid('Escolha a plataforma.'),
  valor: numeroObrigatorio('Informe o valor.'),
  qtd_corridas: numeroOpcional('Quantidade de corridas inválida.'),
  km: numeroOpcional('KM inválido.'),
  duracao_min: numeroOpcional('Duração inválida.'),
  nota_passageiro: numeroOpcional('Nota inválida.', { min: 0 }),
});

/**
 * Registra uma corrida em tempo real, dentro do turno aberto (seção 6/mockup:
 * fluxo "Adicionar ganho"). Cada toque grava uma linha em `shift_revenues` —
 * é essa mesma tabela que, no fechamento, já vem pronta em vez de reperguntar
 * o faturamento do dia, e é ela que sustenta a tela de "Detalhes da corrida".
 * Km, duração e nota do passageiro são opcionais: só aparecem depois se o
 * motorista de fato informar — nunca são inventados.
 */
export async function adicionarGanho(_estado: FormState, formData: FormData): Promise<FormState> {
  const parsed = ganhoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();

  const { data: turno } = await supabase
    .from('shifts')
    .select('id, status')
    .eq('id', parsed.data.shift_id)
    .maybeSingle();

  if (!turno || turno.status !== 'aberto') {
    return { erro: 'Este turno não está mais aberto.' };
  }

  const { error } = await supabase.from('shift_revenues').insert({
    user_id: user.id,
    shift_id: parsed.data.shift_id,
    category_id: parsed.data.category_id,
    valor: parsed.data.valor,
    qtd_corridas:
      parsed.data.qtd_corridas !== null ? Math.round(parsed.data.qtd_corridas) : null,
    km: parsed.data.km,
    duracao_min: parsed.data.duracao_min,
    nota_passageiro: parsed.data.nota_passageiro,
    occurred_at: new Date().toISOString(),
  });

  if (error) return { erro: 'Não foi possível registrar o ganho.' };

  revalidatePath('/app/turno');
  // O `?ok=` leva a tela do turno a mostrar "foi pra aqui" — a confirmação
  // some sozinha assim que a pessoa navega, porque a URL some com ela.
  redirect(`/app/turno?ok=ganho&valor=${formatarValorParaUrl(parsed.data.valor)}`);
}

/** Remove uma corrida lançada por engano — só enquanto o turno está aberto. */
export async function excluirGanho(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  const { data: linha } = await supabase
    .from('shift_revenues')
    .select('shift_id')
    .eq('id', id)
    .maybeSingle();
  if (!linha) return;

  const { data: turno } = await supabase
    .from('shifts')
    .select('status')
    .eq('id', linha.shift_id)
    .maybeSingle();
  if (turno?.status !== 'aberto') return;

  await supabase.from('shift_revenues').delete().eq('id', id);

  revalidatePath('/app/turno');
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

  redirect(
    parsed.data.shift_id
      ? `/app/turno?ok=despesa&valor=${formatarValorParaUrl(parsed.data.valor)}`
      : `/app?ok=despesa&valor=${formatarValorParaUrl(parsed.data.valor)}`,
  );
}

export async function excluirTransacao(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  await supabase.from('transactions').delete().eq('id', id);

  revalidatePath('/app');
  revalidatePath('/app/turno');
  revalidatePath('/app/transacoes');
}

/** Mesma exclusão de sempre, mas de dentro da tela de edição — aí faz sentido
 * voltar pra lista em vez de deixar a pessoa numa tela de um lançamento que
 * não existe mais. */
export async function excluirTransacaoEVoltar(formData: FormData): Promise<void> {
  await excluirTransacao(formData);
  redirect('/app/transacoes');
}

const edicaoSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid('Escolha a categoria.'),
  valor: numeroObrigatorio('Informe o valor.'),
  description: z.string().trim().max(120).optional(),
});

/**
 * Edição de um lançamento avulso (seção 12 — edição em linha nas Transações).
 * Só altera categoria, valor e descrição: `kind`, data e turno não mudam por
 * aqui, porque trocar isso reclassificaria o lançamento — melhor excluir e
 * lançar de novo nesse caso.
 */
export async function atualizarTransacao(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = edicaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from('transactions')
    .update({
      category_id: parsed.data.category_id,
      valor: parsed.data.valor,
      description: parsed.data.description || null,
    })
    .eq('id', parsed.data.id);

  if (error) return { erro: 'Não foi possível salvar as alterações.' };

  revalidatePath('/app');
  revalidatePath('/app/turno');
  revalidatePath('/app/transacoes');
  redirect('/app/transacoes');
}

// ---------------------------------------------------------------------------

const fecharSchema = z.object({
  shift_id: z.string().uuid(),
  odo_final: numeroObrigatorio('Informe o hodômetro final.'),
  custo_combustivel_real: numeroOpcional('Valor de combustível inválido.'),
});

/**
 * Fecha o turno (seção 12).
 *
 * O faturamento não é mais reperguntado aqui: cada corrida já foi lançada em
 * tempo real (`adicionarGanho`), então o fechamento só lê o que já está em
 * `shift_revenues` e agrupa por plataforma. Isso é o que sustenta a tela de
 * "Detalhes da corrida" depois — se reperguntássemos o total no fechamento,
 * o detalhe por corrida se perderia.
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

  // Faturamento: agrupa por plataforma o que já foi lançado corrida a corrida
  // durante o turno — nada é reperguntado no fechamento.
  const { data: ganhos } = await supabase
    .from('shift_revenues')
    .select('category_id, valor, qtd_corridas')
    .eq('shift_id', turno.id);

  const porCategoria = new Map<string, { valor: number; qtdCorridas: number | null }>();
  for (const g of ganhos ?? []) {
    const atual = porCategoria.get(g.category_id) ?? { valor: 0, qtdCorridas: null };
    atual.valor += Number(g.valor);
    if (g.qtd_corridas !== null) {
      atual.qtdCorridas = (atual.qtdCorridas ?? 0) + Number(g.qtd_corridas);
    }
    porCategoria.set(g.category_id, atual);
  }

  const receitas: ShiftRevenue[] = Array.from(porCategoria.entries()).map(
    ([categoryId, v]) => ({ categoryId, valor: v.valor, qtdCorridas: v.qtdCorridas }),
  );

  if (receitas.length === 0) {
    return {
      erro: 'Nenhum ganho registrado neste turno ainda. Adicione ao menos uma corrida antes de fechar.',
    };
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

  // O relógio exclui o tempo em pausa: a hora inicial "efetiva" é empurrada
  // para frente pelo total pausado, sem alterar o `started_at` gravado (ele
  // continua servindo para o "Começou às HH:MM" em outras telas).
  const segundosUteis = segundosTrabalhados(
    turno.started_at,
    fim,
    Number(turno.paused_seconds ?? 0),
    turno.paused_at,
  );
  const inicioEfetivo = new Date(fim.getTime() - segundosUteis * 1000);

  const fechamento = fecharTurno(
    {
      startedAt: inicioEfetivo.toISOString(),
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
      corridas: fechamento.snapshot.qtdCorridas,
    },
    // Vazio de propósito: as linhas já estão em `shift_revenues` desde que
    // foram lançadas em tempo real, e a RPC só apaga+reinsere quando este
    // array vem não-vazio — ver migração `fechar_turno_preserve_live_receitas`.
    p_receitas: [],
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
