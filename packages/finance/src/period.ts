import { money, roundTo, safeDiv, sumMoney } from './money';

/**
 * Fechamento mensal, comparações entre períodos e progresso de metas
 * (seções 13 e 15).
 */

export interface ShiftSnapshot {
  workDate: string;
  km: number;
  horas: number;
  litros: number;
  faturamento: number;
  custoCombustivel: number;
  outrasDespesas: number;
  resultadoOperacional: number;
  reservaVeiculo: number;
  reservaEmergencia: number;
  disponivel: number;
  qtdCorridas?: number | null;
}

export interface FuelSummary {
  litros: number;
  custo: number;
}

export interface PeriodTotals {
  diasTrabalhados: number;
  turnos: number;
  km: number;
  horas: number;
  /** Faturamento rodando: o que entrou pelas plataformas, dentro de turno. */
  faturamento: number;
  /** Receitas fora de turno (gorjeta avulsa, venda, reembolso). */
  outrasReceitas: number;
  /** Tudo que entrou no período. */
  entradaTotal: number;
  custoCombustivel: number;
  outrasDespesas: number;
  resultadoOperacional: number;
  reservaVeiculo: number;
  reservaEmergencia: number;
  disponivel: number;
  qtdCorridas: number | null;
  litrosEstimados: number;
  litrosAbastecidos: number;
  gastoCombustivelReal: number;
  precoMedioLitro: number | null;
  consumoMedio: number | null;
  faturamentoPorKm: number | null;
  faturamentoPorHora: number | null;
  custoCombustivelPorKm: number | null;
  resultadoPorKm: number | null;
  resultadoPorHora: number | null;
  manutencaoRealizada: number;
}

/**
 * Agrega um período a partir dos snapshots dos turnos.
 *
 * Os snapshots são a fonte: eles congelaram os números no fechamento de cada
 * dia. Recalcular agora, com o consumo e os percentuais de hoje, reescreveria
 * o passado e faria o relatório divergir do que o motorista viu no dia.
 *
 * Receitas e despesas lançadas fora de turno entram no resultado e no
 * disponível, mas **não** em R$/km nem em R$/hora: uma gorjeta recebida em
 * casa não foi ganha rodando, e somá-la inflaria o indicador que o motorista
 * usa para decidir se vale a pena trabalhar.
 */
export function agregarPeriodo(
  turnos: readonly ShiftSnapshot[],
  extras: {
    abastecimentos?: readonly FuelSummary[];
    manutencoes?: readonly number[];
    despesasAvulsas?: readonly number[];
    receitasAvulsas?: readonly number[];
  } = {},
): PeriodTotals {
  const dias = new Set(turnos.map((t) => t.workDate));
  const soma = (f: (t: ShiftSnapshot) => number) => turnos.reduce((acc, t) => acc + f(t), 0);

  const km = roundTo(soma((t) => t.km), 2);
  const horas = roundTo(soma((t) => t.horas), 2);
  const faturamento = money(soma((t) => t.faturamento));
  const custoCombustivel = money(soma((t) => t.custoCombustivel));
  const despesasDosTurnos = soma((t) => t.outrasDespesas);
  const despesasAvulsas = (extras.despesasAvulsas ?? []).reduce((a, b) => a + b, 0);
  const receitasAvulsas = (extras.receitasAvulsas ?? []).reduce((a, b) => a + b, 0);
  const outrasDespesas = money(despesasDosTurnos + despesasAvulsas);
  const resultadoOperacional = money(
    soma((t) => t.resultadoOperacional) - despesasAvulsas + receitasAvulsas,
  );

  const corridas = turnos
    .map((t) => t.qtdCorridas)
    .filter((q): q is number => typeof q === 'number');

  const abastecimentos = extras.abastecimentos ?? [];
  const litrosAbastecidos = roundTo(abastecimentos.reduce((a, b) => a + b.litros, 0), 3);
  const gastoCombustivelReal = sumMoney(abastecimentos.map((a) => a.custo));

  return {
    diasTrabalhados: dias.size,
    turnos: turnos.length,
    km,
    horas,
    faturamento,
    outrasReceitas: money(receitasAvulsas),
    entradaTotal: money(faturamento + receitasAvulsas),
    custoCombustivel,
    outrasDespesas,
    resultadoOperacional,
    reservaVeiculo: money(soma((t) => t.reservaVeiculo)),
    reservaEmergencia: money(soma((t) => t.reservaEmergencia)),
    disponivel: money(soma((t) => t.disponivel) - despesasAvulsas + receitasAvulsas),
    qtdCorridas: corridas.length > 0 ? corridas.reduce((a, b) => a + b, 0) : null,
    litrosEstimados: roundTo(soma((t) => t.litros), 3),
    litrosAbastecidos,
    gastoCombustivelReal,
    precoMedioLitro: safeDiv(gastoCombustivelReal, litrosAbastecidos, 4),
    consumoMedio: safeDiv(km, litrosAbastecidos, 2),
    faturamentoPorKm: safeDiv(faturamento, km, 4),
    faturamentoPorHora: safeDiv(faturamento, horas, 2),
    custoCombustivelPorKm: safeDiv(custoCombustivel, km, 4),
    resultadoPorKm: safeDiv(resultadoOperacional, km, 4),
    resultadoPorHora: safeDiv(resultadoOperacional, horas, 2),
    manutencaoRealizada: sumMoney(extras.manutencoes ?? []),
  };
}

/**
 * Variação percentual entre dois períodos.
 * `null` quando o período anterior é zero: não existe variação sobre o nada,
 * e mostrar "+∞%" ou "+100%" seria inventar informação.
 */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior) || anterior === 0) return null;
  return roundTo(((atual - anterior) / Math.abs(anterior)) * 100, 2);
}

export interface Comparacao<T = number> {
  atual: T;
  anterior: T;
  diferenca: number;
  variacao: number | null;
  direcao: 'alta' | 'baixa' | 'estavel' | 'indefinida';
}

/** Compara um indicador entre dois períodos. */
export function compararIndicador(atual: number, anterior: number): Comparacao {
  const variacao = variacaoPercentual(atual, anterior);
  const diferenca = roundTo(atual - anterior, 4);
  const direcao: Comparacao['direcao'] =
    variacao === null ? 'indefinida' : diferenca > 0 ? 'alta' : diferenca < 0 ? 'baixa' : 'estavel';
  return { atual, anterior, diferenca, variacao, direcao };
}

/** Compara mês atual com mês anterior em todos os indicadores numéricos. */
export function compararPeriodos(
  atual: PeriodTotals,
  anterior: PeriodTotals,
): Partial<Record<keyof PeriodTotals, Comparacao>> {
  const saida: Partial<Record<keyof PeriodTotals, Comparacao>> = {};
  for (const chave of Object.keys(atual) as Array<keyof PeriodTotals>) {
    const a = atual[chave];
    const b = anterior[chave];
    if (typeof a === 'number' && typeof b === 'number') {
      saida[chave] = compararIndicador(a, b);
    }
  }
  return saida;
}

export interface ProgressoMeta {
  realizado: number;
  alvo: number;
  percentual: number | null;
  restante: number;
  atingida: boolean;
}

/** Progresso de uma meta: 2.850 de 4.000 → 71,25%. */
export function progressoMeta(realizado: number, alvo: number): ProgressoMeta {
  const percentual = safeDiv(realizado * 100, alvo, 2);
  return {
    realizado: money(realizado),
    alvo: money(alvo),
    percentual,
    restante: money(Math.max(alvo - realizado, 0)),
    atingida: alvo > 0 && realizado >= alvo,
  };
}

/**
 * Ritmo necessário para bater a meta no que resta do período.
 * `null` quando não há dias restantes ou a meta já foi batida.
 */
export function ritmoNecessario(
  realizado: number,
  alvo: number,
  diasRestantes: number,
): number | null {
  if (diasRestantes <= 0) return null;
  const falta = alvo - realizado;
  if (falta <= 0) return null;
  return money(falta / diasRestantes);
}

/**
 * Rentabilidade por plataforma (não só receita) — seção do relatório.
 *
 * O Sobrou sabe quanto cada plataforma pagou dentro de um turno, mas não
 * quanto km foi rodado para cada uma: os apps ficam ligados ao mesmo tempo.
 * O custo do turno (combustível + outras despesas) é rateado entre as
 * plataformas na mesma proporção da receita que cada uma trouxe naquele
 * turno específico — não é uma medição perfeita, mas já responde "qual
 * plataforma rendeu mais por hora de verdade", que é o que decide para
 * onde vale mais a pena dar preferência. Turnos sem faturamento (share
 * indefinido) simplesmente não entram no rateio daquele turno.
 */
export interface ShiftForPlatforms {
  id: string;
  km: number;
  horas: number;
  faturamento: number;
  custoCombustivel: number;
  outrasDespesas: number;
}

export interface ShiftPlatformRevenue {
  shiftId: string;
  categoryId: string;
  valor: number;
  corridas?: number | null;
}

export interface PlatformSummary {
  categoryId: string;
  valor: number;
  corridas: number;
  kmAlocado: number;
  horasAlocado: number;
  custoAlocado: number;
  margem: number;
  margemPorKm: number | null;
  margemPorHora: number | null;
}

export function porPlataforma(
  turnos: readonly ShiftForPlatforms[],
  receitas: readonly ShiftPlatformRevenue[],
): PlatformSummary[] {
  const porTurno = new Map(turnos.map((t) => [t.id, t]));
  const acc = new Map<
    string,
    { valor: number; corridas: number; km: number; horas: number; custo: number }
  >();

  for (const r of receitas) {
    const turno = porTurno.get(r.shiftId);
    if (!turno) continue;
    const share = safeDiv(r.valor, turno.faturamento) ?? 0;
    const custoTurno = turno.custoCombustivel + turno.outrasDespesas;

    const atual = acc.get(r.categoryId) ?? { valor: 0, corridas: 0, km: 0, horas: 0, custo: 0 };
    atual.valor += r.valor;
    atual.corridas += r.corridas ?? 0;
    atual.km += turno.km * share;
    atual.horas += turno.horas * share;
    atual.custo += custoTurno * share;
    acc.set(r.categoryId, atual);
  }

  return [...acc.entries()]
    .map(([categoryId, v]) => {
      const margem = money(v.valor - v.custo);
      return {
        categoryId,
        valor: money(v.valor),
        corridas: v.corridas,
        kmAlocado: roundTo(v.km, 2),
        horasAlocado: roundTo(v.horas, 2),
        custoAlocado: money(v.custo),
        margem,
        margemPorKm: safeDiv(margem, v.km, 4),
        margemPorHora: safeDiv(margem, v.horas, 2),
      };
    })
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Série diária de resultado operacional e disponível — para o gráfico de
 * evolução dos relatórios. Soma turnos do mesmo dia (pode haver mais de
 * um) e ordena por data crescente. Vem dos mesmos snapshots congelados de
 * `agregarPeriodo`, então nunca diverge dos totais do período.
 */
export interface PontoDiario {
  workDate: string;
  resultadoOperacional: number;
  disponivel: number;
}

export function serieDiaria(turnos: readonly ShiftSnapshot[]): PontoDiario[] {
  const porDia = new Map<string, { resultado: number; disponivel: number }>();
  for (const t of turnos) {
    const atual = porDia.get(t.workDate) ?? { resultado: 0, disponivel: 0 };
    atual.resultado += t.resultadoOperacional;
    atual.disponivel += t.disponivel;
    porDia.set(t.workDate, atual);
  }
  return [...porDia.entries()]
    .map(([workDate, v]) => ({
      workDate,
      resultadoOperacional: money(v.resultado),
      disponivel: money(v.disponivel),
    }))
    .sort((a, b) => (a.workDate < b.workDate ? -1 : a.workDate > b.workDate ? 1 : 0));
}
