import 'server-only';

import {
  alertasDoDia,
  avaliarDia,
  custoCombustivelEstimado,
  farol,
  formatMoney,
  inicioDoMes,
  lucroEstimado,
  medias,
  metaDoDia,
  planejarMes,
  segundosEfetivos,
  segundosTrabalhados,
  somarDias,
  type Alerta,
  type AvaliacaoDia,
  type CustosPorKm,
  type Farol,
  type Limites,
  type LucroEstimado,
  type MetaDoDia,
  type PlanoMes,
} from '@sobrou/finance';
import { parametrosDoTurno, type ContextoUsuario } from '@/lib/dados/contexto';
import { carregarPeriodo, type DadosPeriodo } from '@/lib/relatorios/dados';
import { createClient } from '@/lib/supabase/server';
import { dataLocal } from '@/lib/numeros';

/**
 * Meta do Mês — a leitura que alimenta o painel, o Modo Corrida, o resumo do
 * dia e o histórico. Todos os números saem daqui e do @sobrou/finance; as
 * telas só exibem.
 *
 * Fontes: turnos fechados (snapshots) + o turno aberto agora, ao vivo. O turno
 * aberto entra como "hoje" mesmo que tenha começado antes da meia-noite: é o
 * dia de trabalho em andamento.
 */

export interface ConfigMeta {
  diasDeTrabalho: number[];
  limites: { porHora: Limites; porKm: Limites; lucroPorHora: Limites };
  custosPorKm: CustosPorKm;
  /** Manutenção/km veio da configuração da meta ou da estimativa do veículo. */
  origemManutencao: 'meta' | 'veiculo' | 'nenhuma';
  custoManutencaoKmConfigurado: number | null;
}

export const DIAS_PADRAO = [1, 2, 3, 4, 5, 6];

export async function carregarConfigMeta(ctx: ContextoUsuario): Promise<ConfigMeta> {
  const supabase = await createClient();
  const { data: s } = await supabase.from('meta_settings').select('*').eq('user_id', ctx.userId).maybeSingle();

  const manutencaoVeiculo =
    ctx.veiculo?.manutencao_km_estimada !== null && ctx.veiculo?.manutencao_km_estimada !== undefined
      ? Number(ctx.veiculo.manutencao_km_estimada)
      : null;
  const manutencaoMeta = s?.custo_manutencao_km !== null && s?.custo_manutencao_km !== undefined ? Number(s.custo_manutencao_km) : null;

  return {
    diasDeTrabalho: s?.work_weekdays?.map(Number) ?? DIAS_PADRAO,
    limites: {
      porHora: { vermelhoAbaixo: Number(s?.rs_h_vermelho ?? 30), verdeAcima: Number(s?.rs_h_verde ?? 40) },
      porKm: { vermelhoAbaixo: Number(s?.rs_km_vermelho ?? 2), verdeAcima: Number(s?.rs_km_verde ?? 2.8) },
      lucroPorHora: { vermelhoAbaixo: Number(s?.liq_h_vermelho ?? 20), verdeAcima: Number(s?.liq_h_verde ?? 30) },
    },
    custosPorKm: {
      manutencao: manutencaoMeta ?? manutencaoVeiculo ?? 0,
      pneus: Number(s?.custo_pneus_km ?? 0),
      revisao: Number(s?.custo_revisao_km ?? 0),
      outros: Number(s?.custo_outros_km ?? 0),
    },
    origemManutencao: manutencaoMeta !== null ? 'meta' : manutencaoVeiculo !== null ? 'veiculo' : 'nenhuma',
    custoManutencaoKmConfigurado: manutencaoMeta,
  };
}

/** Meta do mês (YYYY-MM-01). Cai na meta mensal antiga só para o mês corrente. */
export async function alvoDoMes(mes: string, mesCorrente: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('month_targets').select('target_value').eq('month', mes).maybeSingle();
  if (data) return Number(data.target_value);
  if (mes !== mesCorrente) return null;
  const { data: antiga } = await supabase
    .from('goals')
    .select('target_value')
    .eq('kind', 'fat_mensal')
    .eq('is_active', true)
    .maybeSingle();
  return antiga ? Number(antiga.target_value) : null;
}

export interface Totais {
  faturamento: number;
  horas: number;
  km: number;
  combustivel: number;
  despesas: number;
  corridas: number | null;
}

const ZERO: Totais = { faturamento: 0, horas: 0, km: 0, combustivel: 0, despesas: 0, corridas: null };

function somar(a: Totais, b: Totais): Totais {
  return {
    faturamento: a.faturamento + b.faturamento,
    horas: a.horas + b.horas,
    km: a.km + b.km,
    combustivel: a.combustivel + b.combustivel,
    despesas: a.despesas + b.despesas,
    corridas: a.corridas === null && b.corridas === null ? null : (a.corridas ?? 0) + (b.corridas ?? 0),
  };
}

function deSnapshot(t: DadosPeriodo['turnos'][number]): Totais {
  return {
    faturamento: Number(t.snap_faturamento ?? 0),
    horas: Number(t.snap_horas ?? 0),
    km: Number(t.snap_km ?? 0),
    combustivel: Number(t.snap_custo_combustivel ?? 0),
    despesas: Number(t.snap_outras_despesas ?? 0),
    corridas: t.snap_corridas !== null ? Number(t.snap_corridas) : null,
  };
}

export interface TurnoAoVivo {
  id: string;
  startedAt: string;
  workDate: string;
  pausado: boolean;
  /** true quando o km veio de pelo menos um ganho lançado. */
  temKm: boolean;
  totais: Totais;
}

async function carregarTurnoAberto(ctx: ContextoUsuario): Promise<TurnoAoVivo | null> {
  const supabase = await createClient();
  const { data: turno } = await supabase
    .from('shifts')
    .select('id, started_at, work_date, paused_seconds, paused_at')
    .eq('status', 'aberto')
    .maybeSingle();
  if (!turno) return null;

  const [{ data: ganhos }, { data: despesas }] = await Promise.all([
    supabase.from('shift_revenues').select('valor, km, qtd_corridas, duracao_min').eq('shift_id', turno.id),
    supabase.from('transactions').select('valor').eq('shift_id', turno.id).eq('kind', 'despesa'),
  ]);

  const lista = ganhos ?? [];
  const minutos = lista.reduce((a, g) => a + Number(g.duracao_min ?? 0), 0);
  const segundos = segundosEfetivos(
    segundosTrabalhados(turno.started_at, new Date(), Number(turno.paused_seconds ?? 0), turno.paused_at),
    minutos,
  );
  const temKm = lista.some((g) => g.km !== null);
  const km = lista.reduce((a, g) => a + (g.km !== null ? Number(g.km) : 0), 0);
  const p = parametrosDoTurno(ctx);
  const corridas = lista.filter((g) => g.qtd_corridas !== null);

  return {
    id: turno.id,
    startedAt: turno.started_at,
    workDate: turno.work_date,
    pausado: turno.paused_at !== null,
    temKm,
    totais: {
      faturamento: lista.reduce((a, g) => a + Number(g.valor), 0),
      horas: segundos / 3600,
      km,
      combustivel: temKm ? (custoCombustivelEstimado(km, p.consumo, p.preco) ?? 0) : 0,
      despesas: (despesas ?? []).reduce((a, d) => a + Number(d.valor), 0),
      corridas: corridas.length > 0 ? corridas.reduce((a, g) => a + Number(g.qtd_corridas), 0) : null,
    },
  };
}

export interface LinhaDia {
  data: string;
  totais: Totais;
  lucro: LucroEstimado;
}

/** Agrupa os turnos fechados por dia, já com o lucro estimado de cada dia. */
export function linhasPorDia(turnos: DadosPeriodo['turnos'], custosPorKm: CustosPorKm, extra?: { data: string; totais: Totais }): LinhaDia[] {
  const porDia = new Map<string, Totais>();
  for (const t of turnos) porDia.set(t.work_date, somar(porDia.get(t.work_date) ?? ZERO, deSnapshot(t)));
  if (extra) porDia.set(extra.data, somar(porDia.get(extra.data) ?? ZERO, extra.totais));
  return [...porDia.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([data, totais]) => ({ data, totais, lucro: lucroDe(totais, custosPorKm) }));
}

export function lucroDe(t: Totais, custosPorKm: CustosPorKm): LucroEstimado {
  return lucroEstimado({
    faturamento: t.faturamento,
    km: t.km,
    horas: t.horas,
    combustivel: t.combustivel,
    despesas: t.despesas,
    custosPorKm,
  });
}

export interface PainelMeta {
  hoje: string;
  /** Dia de trabalho em andamento (o do turno aberto, ou hoje). */
  dia: string;
  mes: string;
  timezone: string;
  config: ConfigMeta;
  alvo: number | null;
  aberto: TurnoAoVivo | null;
  totaisHoje: Totais;
  totaisMes: Totais;
  diasTrabalhados: number;
  plano: PlanoMes | null;
  metaHoje: MetaDoDia | null;
  metaManualHoje: number | null;
  /** "18:35" — só quando há turno aberto e dá para estimar. */
  previsaoHorario: string | null;
  lucroHoje: LucroEstimado;
  lucroMes: LucroEstimado;
  farois: { porHora: Farol | null; porKm: Farol | null; lucroPorHora: Farol | null };
  faroisMes: { porHora: Farol | null; porKm: Farol | null; lucroPorHora: Farol | null };
  alertas: Alerta[];
  avaliacaoHoje: AvaliacaoDia;
  linhas: LinhaDia[];
  recortadoPeloPlano: boolean;
}

export async function carregarPainelMeta(ctx: ContextoUsuario): Promise<PainelMeta> {
  const supabase = await createClient();
  const hoje = dataLocal(new Date(), ctx.timezone);
  const config = await carregarConfigMeta(ctx);
  const aberto = await carregarTurnoAberto(ctx);

  const dia = aberto?.workDate ?? hoje;
  const mes = inicioDoMes(dia);
  const [alvo, periodo, { data: manual }] = await Promise.all([
    alvoDoMes(mes, inicioDoMes(hoje)),
    carregarPeriodo(mes, hoje),
    supabase.from('day_targets').select('target_value').eq('work_date', dia).maybeSingle(),
  ]);

  const turnosDoMes = periodo.turnos.filter((t) => t.work_date.slice(0, 7) === mes.slice(0, 7));
  const antes = turnosDoMes.filter((t) => t.work_date < dia).map(deSnapshot).reduce(somar, ZERO);
  const fechadosHoje = turnosDoMes.filter((t) => t.work_date === dia).map(deSnapshot).reduce(somar, ZERO);
  const totaisHoje = aberto ? somar(fechadosHoje, aberto.totais) : fechadosHoje;
  const totaisMes = somar(antes, totaisHoje);

  const dias = new Set(turnosDoMes.map((t) => t.work_date));
  if (aberto && aberto.totais.faturamento > 0) dias.add(dia);

  const metaManualHoje = manual ? Number(manual.target_value) : null;

  const plano =
    alvo !== null
      ? planejarMes({
          alvo,
          hoje: dia,
          diasDeTrabalho: config.diasDeTrabalho,
          faturadoAntesDeHoje: antes.faturamento,
          faturadoHoje: totaisHoje.faturamento,
          hojeEncerrado: !aberto && fechadosHoje.faturamento > 0,
          desempenho: { faturamento: totaisMes.faturamento, horas: totaisMes.horas, km: totaisMes.km, diasTrabalhados: dias.size },
          metaManualHoje,
        })
      : null;

  const valorMetaHoje = plano?.metaHoje ?? metaManualHoje;
  const metaHoje =
    valorMetaHoje !== null && valorMetaHoje !== undefined
      ? metaDoDia({ meta: valorMetaHoje, faturado: totaisHoje.faturamento, horas: totaisHoje.horas, km: totaisHoje.km })
      : null;

  const previsaoHorario =
    aberto && metaHoje && !metaHoje.atingida && metaHoje.horasRestantes !== null
      ? new Intl.DateTimeFormat('pt-BR', { timeZone: ctx.timezone, hour: '2-digit', minute: '2-digit' }).format(
          new Date(Date.now() + metaHoje.horasRestantes * 3_600_000),
        )
      : null;

  const lucroHoje = lucroDe(totaisHoje, config.custosPorKm);
  const lucroMes = lucroDe(totaisMes, config.custosPorKm);
  const mHoje = medias({ ...totaisHoje, diasTrabalhados: 1 });
  const mMes = medias({ ...totaisMes, diasTrabalhados: dias.size });

  const farois = {
    porHora: farol(mHoje.porHora, config.limites.porHora),
    porKm: farol(mHoje.porKm, config.limites.porKm),
    lucroPorHora: farol(lucroHoje.lucroPorHora, config.limites.lucroPorHora),
  };
  const faroisMes = {
    porHora: farol(mMes.porHora, config.limites.porHora),
    porKm: farol(mMes.porKm, config.limites.porKm),
    lucroPorHora: farol(lucroMes.lucroPorHora, config.limites.lucroPorHora),
  };

  return {
    hoje,
    dia,
    mes,
    timezone: ctx.timezone,
    config,
    alvo,
    aberto,
    totaisHoje,
    totaisMes,
    diasTrabalhados: dias.size,
    plano,
    metaHoje,
    metaManualHoje,
    previsaoHorario,
    lucroHoje,
    lucroMes,
    farois,
    faroisMes,
    alertas: metaHoje
      ? alertasDoDia({ dia: metaHoje, porHoraFarol: farois.porHora, porKmFarol: farois.porKm, formatar: formatMoney })
      : [],
    avaliacaoHoje: avaliarDia({
      porHora: mHoje.porHora,
      porKm: mHoje.porKm,
      lucroPorHora: lucroHoje.lucroPorHora,
      limites: config.limites,
    }),
    linhas: linhasPorDia(turnosDoMes, config.custosPorKm, aberto ? { data: dia, totais: aberto.totais } : undefined),
    recortadoPeloPlano: periodo.recortadoPeloPlano,
  };
}

export interface ResumoDia {
  data: string;
  totais: Totais;
  lucro: LucroEstimado;
  meta: MetaDoDia | null;
  avaliacao: AvaliacaoDia;
  farois: { porHora: Farol | null; porKm: Farol | null; lucroPorHora: Farol | null };
  /** Progresso do mês da data, até agora. */
  mes: string;
  alvo: number | null;
  acumuladoMes: number;
  proximoDia: { data: string; minima: number } | null;
}

/** Resumo de um dia (padrão: o dia de trabalho em andamento). */
export async function carregarResumoDia(ctx: ContextoUsuario, data: string): Promise<ResumoDia> {
  const painel = await carregarPainelMeta(ctx);
  const supabase = await createClient();
  const mes = inicioDoMes(data);
  const config = painel.config;

  const [periodo, alvo, { data: manual }] = await Promise.all([
    carregarPeriodo(mes, painel.hoje),
    alvoDoMes(mes, inicioDoMes(painel.hoje)),
    supabase.from('day_targets').select('target_value').eq('work_date', data).maybeSingle(),
  ]);
  const turnos = periodo.turnos.filter((t) => t.work_date.slice(0, 7) === mes.slice(0, 7));
  const antes = turnos.filter((t) => t.work_date < data).map(deSnapshot).reduce(somar, ZERO);
  let doDia = turnos.filter((t) => t.work_date === data).map(deSnapshot).reduce(somar, ZERO);
  if (painel.aberto && painel.dia === data) doDia = somar(doDia, painel.aberto.totais);
  const acumuladoMes = turnos.map(deSnapshot).reduce(somar, ZERO).faturamento + (painel.aberto && painel.dia.slice(0, 7) === mes.slice(0, 7) ? painel.aberto.totais.faturamento : 0);

  const dias = new Set(turnos.filter((t) => t.work_date <= data).map((t) => t.work_date));
  const ateODia = somar(antes, doDia);
  const plano =
    alvo !== null
      ? planejarMes({
          alvo,
          hoje: data,
          diasDeTrabalho: config.diasDeTrabalho,
          faturadoAntesDeHoje: antes.faturamento,
          faturadoHoje: doDia.faturamento,
          hojeEncerrado: !(painel.aberto && painel.dia === data),
          desempenho: { faturamento: ateODia.faturamento, horas: ateODia.horas, km: ateODia.km, diasTrabalhados: dias.size },
          metaManualHoje: manual ? Number(manual.target_value) : null,
        })
      : null;

  const valorMeta = plano?.metaHoje ?? (manual ? Number(manual.target_value) : null);
  const lucro = lucroDe(doDia, config.custosPorKm);
  const m = medias({ ...doDia, diasTrabalhados: 1 });

  // Próximo dia de trabalho, já com a meta redistribuída a partir de agora.
  const proximo = painel.plano?.proximosDias[0] ?? null;

  return {
    data,
    totais: doDia,
    lucro,
    meta: valorMeta !== null ? metaDoDia({ meta: valorMeta, faturado: doDia.faturamento, horas: doDia.horas, km: doDia.km }) : null,
    avaliacao: avaliarDia({ porHora: m.porHora, porKm: m.porKm, lucroPorHora: lucro.lucroPorHora, limites: config.limites }),
    farois: {
      porHora: farol(m.porHora, config.limites.porHora),
      porKm: farol(m.porKm, config.limites.porKm),
      lucroPorHora: farol(lucro.lucroPorHora, config.limites.lucroPorHora),
    },
    mes,
    alvo,
    acumuladoMes,
    proximoDia: proximo ? { data: proximo.data, minima: proximo.minima } : null,
  };
}
