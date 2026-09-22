import { rate, safeDiv } from './money';
import type { VehicleCostBasis } from './types';

/**
 * Custo real por km (seção 10).
 *
 * Combustível por km é só a ponta. O custo de verdade inclui manutenção,
 * depreciação, seguro e custos fixos.
 *
 * Um cuidado de coerência que o sistema precisa ter: manutenção e depreciação
 * **já são pagas pela reserva do veículo**. Por isso o custo total por km é um
 * INDICADOR — serve para saber se o percentual reservado cobre o custo real —
 * e não é descontado de novo do valor disponível. Descontar duas vezes faria o
 * motorista achar que ganha bem menos do que ganha.
 */

export interface CustoPorKmBreakdown {
  combustivel: number | null;
  manutencao: number | null;
  depreciacao: number | null;
  seguro: number | null;
  fixos: number | null;
  total: number | null;
  /** Componentes que ficaram de fora por falta de dado. */
  faltando: string[];
}

/** Depreciação por km: (valor de compra − valor residual) ÷ vida útil em km. */
export function depreciacaoPorKm(basis: VehicleCostBasis): number | null {
  const { valorCompra, valorResidualEstimado, vidaUtilKm } = basis;
  if (valorCompra == null || vidaUtilKm == null || vidaUtilKm <= 0) return null;
  const residual = valorResidualEstimado ?? 0;
  return safeDiv(Math.max(valorCompra - residual, 0), vidaUtilKm, 4);
}

/** Seguro por km: mensalidade ÷ km médio mensal. */
export function seguroPorKm(basis: VehicleCostBasis): number | null {
  if (!basis.seguroMensal || !basis.kmMedioMensal) return null;
  return safeDiv(basis.seguroMensal, basis.kmMedioMensal, 4);
}

/** Custos fixos por km: aluguel, licenciamento, app, celular ÷ km médio mensal. */
export function fixosPorKm(basis: VehicleCostBasis): number | null {
  if (!basis.custosFixosMensais || !basis.kmMedioMensal) return null;
  return safeDiv(basis.custosFixosMensais, basis.kmMedioMensal, 4);
}

/**
 * Manutenção por km, a partir do histórico real dos últimos 12 meses.
 * Sem histórico suficiente, cai na estimativa manual do cadastro do veículo.
 */
export function manutencaoPorKm(
  totalManutencoes12m: number | null,
  kmRodados12m: number | null,
  estimativaManual?: number | null,
): number | null {
  if (
    totalManutencoes12m != null &&
    kmRodados12m != null &&
    kmRodados12m > 0 &&
    totalManutencoes12m > 0
  ) {
    return safeDiv(totalManutencoes12m, kmRodados12m, 4);
  }
  return estimativaManual != null && estimativaManual > 0 ? rate(estimativaManual) : null;
}

/**
 * Custo total estimado por km.
 *
 * Os componentes sem dado não viram zero: entram em `faltando` e o total é
 * calculado só com o que existe, deixando claro que é um piso, não o número final.
 */
export function custoTotalPorKm(params: {
  combustivelPorKm: number | null;
  basis: VehicleCostBasis;
  totalManutencoes12m?: number | null;
  kmRodados12m?: number | null;
}): CustoPorKmBreakdown {
  const { combustivelPorKm, basis } = params;

  const componentes = {
    combustivel: combustivelPorKm,
    manutencao: manutencaoPorKm(
      params.totalManutencoes12m ?? null,
      params.kmRodados12m ?? null,
      basis.manutencaoKmEstimada,
    ),
    depreciacao: depreciacaoPorKm(basis),
    seguro: seguroPorKm(basis),
    fixos: fixosPorKm(basis),
  };

  const faltando = Object.entries(componentes)
    .filter(([, v]) => v === null)
    .map(([k]) => k);

  const presentes = Object.values(componentes).filter((v): v is number => v !== null);
  const total = presentes.length > 0 ? rate(presentes.reduce((a, b) => a + b, 0)) : null;

  return { ...componentes, total, faltando };
}

/**
 * Custo por km que a reserva do veículo precisa cobrir.
 * Combustível fica de fora: ele já saiu do bolso no dia.
 */
export function custoCobertoPelaReservaPorKm(breakdown: CustoPorKmBreakdown): number | null {
  const partes = [breakdown.manutencao, breakdown.depreciacao].filter(
    (v): v is number => v !== null,
  );
  return partes.length > 0 ? rate(partes.reduce((a, b) => a + b, 0)) : null;
}
