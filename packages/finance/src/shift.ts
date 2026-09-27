import { hoursBetween, hoursBetweenExact, money, rate, roundTo, safeDiv, sumMoney } from './money';
import type { FuelKind, ShiftRevenue } from './types';

/**
 * Turno: dos hodômetros e do relógio aos indicadores de rentabilidade.
 *
 * Tudo aqui é derivado. O banco guarda fatos (hodômetro, horário, valores);
 * os indicadores nascem destas funções e, no fechamento, viram snapshot.
 */

export interface ShiftInput {
  startedAt: Date | string;
  endedAt: Date | string;
  odoInicial: number;
  odoFinal: number;
  /** Consumo do veículo em km/L, preferencialmente o consumo real medido. */
  consumo: number;
  /** Preço de referência do combustível, em R$/L. */
  precoCombustivel: number;
  fuelKind?: FuelKind;
  receitas: readonly ShiftRevenue[];
  /** Despesas lançadas dentro do turno (alimentação, pedágio, lavagem…). */
  despesas?: readonly number[];
  /**
   * Combustível efetivamente abastecido durante o turno, em reais.
   * Quando informado, entra no lugar da estimativa por consumo.
   */
  custoCombustivelReal?: number | null;
}

export interface ShiftResult {
  km: number;
  horas: number | null;
  litros: number | null;
  custoCombustivel: number;
  /** true quando o custo veio de abastecimento real, não de estimativa. */
  custoCombustivelMedido: boolean;
  combustivelPorKm: number | null;
  faturamento: number;
  outrasDespesas: number;
  resultadoOperacional: number;
  faturamentoPorKm: number | null;
  faturamentoPorHora: number | null;
  resultadoPorKm: number | null;
  resultadoPorHora: number | null;
  qtdCorridas: number | null;
  valorMedioPorCorrida: number | null;
  /** Rateio do faturamento por plataforma, para o fechamento diário. */
  porPlataforma: Array<{
    categoryId: string;
    categoryName?: string;
    valor: number;
    qtdCorridas: number | null;
    participacao: number | null;
  }>;
}

/** Quilometragem do turno. Negativa é impossível e vira 0. */
export function kmRodados(odoInicial: number, odoFinal: number): number {
  return roundTo(Math.max(odoFinal - odoInicial, 0), 2);
}

/** Litros estimados: km ÷ consumo médio. */
export function litrosEstimados(km: number, consumo: number): number | null {
  return safeDiv(km, consumo, 4);
}

/** Custo de combustível estimado: litros × preço de referência. */
export function custoCombustivelEstimado(
  km: number,
  consumo: number,
  precoLitro: number,
): number | null {
  const litros = litrosEstimados(km, consumo);
  if (litros === null) return null;
  return money(litros * precoLitro);
}

/** Faturamento total do turno, somando todas as plataformas. */
export function faturamentoTotal(receitas: readonly ShiftRevenue[]): number {
  return sumMoney(receitas.map((r) => r.valor));
}

/** Calcula todos os indicadores do turno de uma vez. */
export function calcularTurno(input: ShiftInput): ShiftResult {
  const km = kmRodados(input.odoInicial, input.odoFinal);
  // `horas` é o que aparece na tela e vai para o snapshot; `horasExatas` é o
  // que divide, para não propagar o erro do arredondamento.
  const horas = hoursBetween(input.startedAt, input.endedAt);
  const horasExatas = hoursBetweenExact(input.startedAt, input.endedAt);
  const litros = litrosEstimados(km, input.consumo);

  const usouReal =
    input.custoCombustivelReal !== null &&
    input.custoCombustivelReal !== undefined &&
    Number.isFinite(input.custoCombustivelReal);

  const custoCombustivel = usouReal
    ? money(input.custoCombustivelReal as number)
    : money(litros !== null ? litros * input.precoCombustivel : 0);

  const faturamento = faturamentoTotal(input.receitas);
  const outrasDespesas = sumMoney(input.despesas ?? []);
  const resultadoOperacional = money(faturamento - custoCombustivel - outrasDespesas);

  const corridas = input.receitas
    .map((r) => r.qtdCorridas)
    .filter((q): q is number => typeof q === 'number' && Number.isFinite(q));
  const qtdCorridas = corridas.length > 0 ? corridas.reduce((a, b) => a + b, 0) : null;

  return {
    km,
    horas,
    litros,
    custoCombustivel,
    custoCombustivelMedido: usouReal,
    combustivelPorKm: safeDiv(custoCombustivel, km, 4),
    faturamento,
    outrasDespesas,
    resultadoOperacional,
    faturamentoPorKm: safeDiv(faturamento, km, 4),
    faturamentoPorHora: horasExatas === null ? null : safeDiv(faturamento, horasExatas, 2),
    resultadoPorKm: safeDiv(resultadoOperacional, km, 4),
    resultadoPorHora:
      horasExatas === null ? null : safeDiv(resultadoOperacional, horasExatas, 2),
    qtdCorridas,
    valorMedioPorCorrida:
      qtdCorridas !== null && qtdCorridas > 0 ? safeDiv(faturamento, qtdCorridas, 2) : null,
    porPlataforma: input.receitas.map((r) => ({
      categoryId: r.categoryId,
      ...(r.categoryName !== undefined ? { categoryName: r.categoryName } : {}),
      valor: money(r.valor),
      qtdCorridas: r.qtdCorridas ?? null,
      participacao: safeDiv(r.valor * 100, faturamento, 2),
    })),
  };
}

/**
 * Segundos de turno já trabalhados, descontando o tempo em pausa — completo
 * (`pausedSeconds`, já somado de pausas anteriores) e, se houver, a pausa
 * em andamento agora (`pausedAt`). Usado tanto para o cronômetro ao vivo
 * quanto para excluir o tempo pausado das horas trabalhadas no fechamento.
 */
export function segundosTrabalhados(
  startedAt: Date | string,
  agora: Date | string,
  pausedSeconds: number,
  pausedAt: Date | string | null,
): number {
  const inicio = new Date(startedAt).getTime();
  const fim = new Date(agora).getTime();
  const bruto = Math.max(0, (fim - inicio) / 1000);
  const pausaEmAndamento = pausedAt ? Math.max(0, (fim - new Date(pausedAt).getTime()) / 1000) : 0;
  return Math.max(0, bruto - Math.max(0, pausedSeconds) - pausaEmAndamento);
}

/** Consumo médio aferido no turno, quando há abastecimento real medido. */
export function consumoAferidoNoTurno(km: number, litrosAbastecidos: number): number | null {
  return safeDiv(km, litrosAbastecidos, 2);
}

/** Preço por litro implícito quando se conhece custo e litros do turno. */
export function precoLitroImplicito(custo: number, litros: number): number | null {
  const r = safeDiv(custo, litros, 4);
  return r === null ? null : rate(r);
}
