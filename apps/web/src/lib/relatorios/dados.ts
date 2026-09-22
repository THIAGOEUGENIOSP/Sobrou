import 'server-only';

import { agregarPeriodo, type PeriodTotals, type ShiftSnapshot } from '@sobrou/finance';
import { createClient } from '@/lib/supabase/server';
import { historyFloor } from '@/lib/entitlements';

/**
 * Leitura de um período para relatório e exportação.
 *
 * Os totais saem sempre de `agregarPeriodo`, a mesma função que o dashboard
 * usa. É isso que garante que o número do relatório, o do dashboard e o do
 * arquivo exportado sejam o mesmo número.
 */

export interface DadosPeriodo {
  totais: PeriodTotals;
  turnos: Array<{
    id: string;
    work_date: string;
    snap_km: number | null;
    snap_horas: number | null;
    snap_faturamento: number | null;
    snap_custo_combustivel: number | null;
    snap_outras_despesas: number | null;
    snap_resultado_op: number | null;
    snap_reserva_veiculo: number | null;
    snap_reserva_emerg: number | null;
    snap_disponivel: number | null;
  }>;
  /** Faturamento por plataforma no período. */
  porPlataforma: Array<{ nome: string; valor: number; corridas: number }>;
  /** Despesas por categoria no período. */
  porCategoria: Array<{ nome: string; valor: number }>;
  /** true quando o plano cortou parte do período pedido. */
  recortadoPeloPlano: boolean;
  deEfetivo: string;
}

export async function carregarPeriodo(de: string, ate: string): Promise<DadosPeriodo> {
  const supabase = await createClient();

  // O limite de histórico do plano é aplicado na consulta, não na tela.
  const piso = await historyFloor();
  const pisoISO = piso ? piso.toISOString().slice(0, 10) : null;
  const deEfetivo = pisoISO && pisoISO > de ? pisoISO : de;

  const { data: turnos } = await supabase
    .from('shifts')
    .select(
      'id, work_date, snap_km, snap_horas, snap_litros, snap_faturamento, snap_custo_combustivel, snap_outras_despesas, snap_resultado_op, snap_reserva_veiculo, snap_reserva_emerg, snap_disponivel',
    )
    .eq('status', 'fechado')
    .gte('work_date', deEfetivo)
    .lte('work_date', ate)
    .order('work_date');

  const { data: abastecimentos } = await supabase
    .from('fuel_entries')
    .select('litros, valor_pago, cashback, filled_at')
    .gte('filled_at', `${deEfetivo}T00:00:00`)
    .lte('filled_at', `${ate}T23:59:59`);

  const { data: manutencoes } = await supabase
    .from('maintenances')
    .select('valor')
    .gte('performed_at', deEfetivo)
    .lte('performed_at', ate);

  const { data: avulsos } = await supabase
    .from('transactions')
    .select('valor, kind, category_id')
    .is('shift_id', null)
    .gte('work_date', deEfetivo)
    .lte('work_date', ate);

  const { data: receitasTurno } = await supabase
    .from('shift_revenues')
    .select('category_id, valor, qtd_corridas, shift_id');

  const { data: despesasTurno } = await supabase
    .from('transactions')
    .select('valor, category_id, work_date')
    .eq('kind', 'despesa')
    .not('shift_id', 'is', null)
    .gte('work_date', deEfetivo)
    .lte('work_date', ate);

  const { data: categorias } = await supabase.from('categories').select('id, name, kind');
  const nome = new Map((categorias ?? []).map((c) => [c.id, c.name]));

  const snapshots: ShiftSnapshot[] = (turnos ?? []).map((t) => ({
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
  }));

  const totais = agregarPeriodo(snapshots, {
    abastecimentos: (abastecimentos ?? []).map((a) => ({
      litros: Number(a.litros),
      custo: Number(a.valor_pago) - Number(a.cashback),
    })),
    manutencoes: (manutencoes ?? []).map((m) => Number(m.valor)),
    despesasAvulsas: (avulsos ?? [])
      .filter((t) => t.kind === 'despesa')
      .map((t) => Number(t.valor)),
    receitasAvulsas: (avulsos ?? [])
      .filter((t) => t.kind === 'receita')
      .map((t) => Number(t.valor)),
  });

  // Faturamento por plataforma: só dos turnos que caem no período.
  const idsNoPeriodo = new Set((turnos ?? []).map((t) => t.id));
  const plataformas = new Map<string, { valor: number; corridas: number }>();
  for (const r of receitasTurno ?? []) {
    if (!idsNoPeriodo.has(r.shift_id)) continue;
    const atual = plataformas.get(r.category_id) ?? { valor: 0, corridas: 0 };
    atual.valor += Number(r.valor);
    atual.corridas += r.qtd_corridas ?? 0;
    plataformas.set(r.category_id, atual);
  }

  const categoriasDespesa = new Map<string, number>();
  for (const d of [...(despesasTurno ?? []), ...(avulsos ?? []).filter((a) => a.kind === 'despesa')]) {
    const id = d.category_id;
    categoriasDespesa.set(id, (categoriasDespesa.get(id) ?? 0) + Number(d.valor));
  }

  return {
    totais,
    turnos: turnos ?? [],
    porPlataforma: [...plataformas.entries()]
      .map(([id, v]) => ({ nome: nome.get(id) ?? 'Receita', ...v }))
      .sort((a, b) => b.valor - a.valor),
    porCategoria: [...categoriasDespesa.entries()]
      .map(([id, valor]) => ({ nome: nome.get(id) ?? 'Despesa', valor }))
      .sort((a, b) => b.valor - a.valor),
    recortadoPeloPlano: deEfetivo !== de,
    deEfetivo,
  };
}
