import 'server-only';

import { agregarPeriodo, type PeriodTotals, type ShiftSnapshot } from '@sobrou/finance';
import { createClient } from '@/lib/supabase/server';
import { historyFloor } from '@/lib/entitlements';

/**
 * Série mês a mês: quanto entrou e quanto saiu em cada um dos últimos N
 * meses, para o dashboard mensal.
 *
 * Cada mês passa pela MESMA `agregarPeriodo` que os Relatórios usam para um
 * intervalo qualquer — aqui só bucketiza turnos, abastecimentos, manutenções
 * e lançamentos avulsos por mês antes de chamar a mesma função. É por isso
 * que o total de um mês aqui nunca pode divergir do que os Relatórios
 * mostrariam se você filtrasse aquele mês inteiro.
 */

export interface PontoMensal {
  /** "YYYY-MM" */
  mes: string;
  totais: PeriodTotals;
}

export interface DadosMensal {
  meses: PontoMensal[];
  /** true quando o plano cortou parte da janela pedida. */
  recortadoPeloPlano: boolean;
}

const MESES_PADRAO = 12;

function chaveMes(iso: string): string {
  return iso.slice(0, 7);
}

function primeiroDiaDoMes(ano: number, mes: number): string {
  return new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
}

/** Lista as chaves "YYYY-MM" de `de` até `ate`, inclusive — meses sem turno entram como zero. */
function chavesDoIntervalo(de: string, ate: string): string[] {
  const [anoDe, mesDe] = de.slice(0, 7).split('-').map(Number);
  const [anoAte, mesAte] = ate.slice(0, 7).split('-').map(Number);
  const chaves: string[] = [];
  let ano = anoDe ?? new Date().getFullYear();
  let mes = (mesDe ?? 1) - 1;
  const limiteAno = anoAte ?? ano;
  const limiteMes = (mesAte ?? 1) - 1;
  while (ano < limiteAno || (ano === limiteAno && mes <= limiteMes)) {
    chaves.push(`${ano}-${String(mes + 1).padStart(2, '0')}`);
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }
  return chaves;
}

export async function carregarSerieMensal(meses: number = MESES_PADRAO): Promise<DadosMensal> {
  const supabase = await createClient();

  const hoje = new Date();
  const deSolicitado = primeiroDiaDoMes(hoje.getFullYear(), hoje.getMonth() - (meses - 1));
  const ate = hoje.toISOString().slice(0, 10);

  const piso = await historyFloor();
  const pisoISO = piso ? piso.toISOString().slice(0, 10) : null;
  const de = pisoISO && pisoISO > deSolicitado ? pisoISO : deSolicitado;

  const { data: turnos } = await supabase
    .from('shifts')
    .select(
      'work_date, snap_km, snap_horas, snap_litros, snap_faturamento, snap_custo_combustivel, snap_outras_despesas, snap_resultado_op, snap_reserva_veiculo, snap_reserva_emerg, snap_disponivel',
    )
    .eq('status', 'fechado')
    .gte('work_date', de)
    .lte('work_date', ate)
    .order('work_date');

  const { data: abastecimentos } = await supabase
    .from('fuel_entries')
    .select('litros, valor_pago, cashback, filled_at')
    .gte('filled_at', `${de}T00:00:00`)
    .lte('filled_at', `${ate}T23:59:59`);

  const { data: manutencoes } = await supabase
    .from('maintenances')
    .select('valor, performed_at')
    .gte('performed_at', de)
    .lte('performed_at', ate);

  const { data: avulsos } = await supabase
    .from('transactions')
    .select('valor, kind, work_date')
    .is('shift_id', null)
    .gte('work_date', de)
    .lte('work_date', ate);

  const turnosPorMes = new Map<string, ShiftSnapshot[]>();
  for (const t of turnos ?? []) {
    const chave = chaveMes(t.work_date);
    const lista = turnosPorMes.get(chave) ?? [];
    lista.push({
      workDate: t.work_date,
      km: Number(t.snap_km ?? 0),
      horas: Number(t.snap_horas ?? 0),
      litros: Number(t.snap_litros ?? 0),
      faturamento: Number(t.snap_faturamento ?? 0),
      custoCombustivel: Number(t.snap_custo_combustivel ?? 0),
      outrasDespesas: Number(t.snap_outras_despesas ?? 0),
      resultadoOperacional: Number(t.snap_resultado_op ?? 0),
      reservaVeiculo: Number(t.snap_reserva_veiculo ?? 0),
      reservaEmergencia: Number(t.snap_reserva_emerg ?? 0),
      disponivel: Number(t.snap_disponivel ?? 0),
    });
    turnosPorMes.set(chave, lista);
  }

  const abastecimentosPorMes = new Map<string, { litros: number; custo: number }[]>();
  for (const a of abastecimentos ?? []) {
    const chave = chaveMes(a.filled_at);
    const lista = abastecimentosPorMes.get(chave) ?? [];
    lista.push({ litros: Number(a.litros), custo: Number(a.valor_pago) - Number(a.cashback) });
    abastecimentosPorMes.set(chave, lista);
  }

  const manutencoesPorMes = new Map<string, number[]>();
  for (const m of manutencoes ?? []) {
    const chave = chaveMes(m.performed_at);
    const lista = manutencoesPorMes.get(chave) ?? [];
    lista.push(Number(m.valor));
    manutencoesPorMes.set(chave, lista);
  }

  const despesasAvulsasPorMes = new Map<string, number[]>();
  const receitasAvulsasPorMes = new Map<string, number[]>();
  for (const a of avulsos ?? []) {
    const chave = chaveMes(a.work_date);
    if (a.kind === 'despesa') {
      const lista = despesasAvulsasPorMes.get(chave) ?? [];
      lista.push(Number(a.valor));
      despesasAvulsasPorMes.set(chave, lista);
    } else {
      const lista = receitasAvulsasPorMes.get(chave) ?? [];
      lista.push(Number(a.valor));
      receitasAvulsasPorMes.set(chave, lista);
    }
  }

  const meses_ = chavesDoIntervalo(de, ate).map((chave) => ({
    mes: chave,
    totais: agregarPeriodo(turnosPorMes.get(chave) ?? [], {
      abastecimentos: abastecimentosPorMes.get(chave) ?? [],
      manutencoes: manutencoesPorMes.get(chave) ?? [],
      despesasAvulsas: despesasAvulsasPorMes.get(chave) ?? [],
      receitasAvulsas: receitasAvulsasPorMes.get(chave) ?? [],
    }),
  }));

  return {
    meses: meses_,
    recortadoPeloPlano: de !== deSolicitado,
  };
}
