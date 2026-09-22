import { money } from './money';
import type { ReserveKind, ReserveMovement } from './types';

/**
 * Reserva x gasto real (seção 8).
 *
 * O ponto que o sistema precisa acertar: dinheiro **reservado** não é dinheiro
 * **gasto**. Reservar credita, gastar debita, e o saldo é a diferença. Sem
 * livro-razão, um sistema acaba tratando toda a reserva como despesa e o
 * motorista perde a noção do quanto realmente tem guardado.
 */

export interface SaldoReserva {
  reserveKind: ReserveKind;
  /** Tudo que já foi separado. */
  totalReservado: number;
  /** Tudo que já saiu (manutenção, imprevisto). */
  totalGasto: number;
  /** O que está guardado hoje. */
  saldo: number;
}

/** Saldo de uma reserva: créditos − débitos. */
export function saldoReserva(
  movimentos: readonly ReserveMovement[],
  kind: ReserveKind,
): SaldoReserva {
  let totalReservado = 0;
  let totalGasto = 0;

  for (const m of movimentos) {
    if (m.reserveKind !== kind) continue;
    if (m.direction === 'credito') totalReservado += m.valor;
    else totalGasto += m.valor;
  }

  return {
    reserveKind: kind,
    totalReservado: money(totalReservado),
    totalGasto: money(totalGasto),
    saldo: money(totalReservado - totalGasto),
  };
}

/** Saldos das duas reservas de uma vez. */
export function saldosReservas(movimentos: readonly ReserveMovement[]): Record<ReserveKind, SaldoReserva> {
  return {
    veiculo: saldoReserva(movimentos, 'veiculo'),
    emergencia: saldoReserva(movimentos, 'emergencia'),
  };
}

/**
 * Quantos meses de custo fixo a reserva de emergência cobre.
 * `null` quando não há custo fixo informado — sem denominador não há resposta.
 */
export function mesesDeFolga(saldo: number, custoMensal: number): number | null {
  if (!Number.isFinite(custoMensal) || custoMensal <= 0) return null;
  return money(saldo / custoMensal);
}

/**
 * A reserva do veículo está no tamanho certo?
 *
 * Compara o que está sendo reservado por km com o custo real de manutenção,
 * depreciação e seguro por km. É o aviso que impede o motorista de descobrir
 * tarde demais que 20% não cobriam a troca do câmbio.
 */
export interface CoberturaReserva {
  reservadoPorKm: number | null;
  custoRealPorKm: number | null;
  /** Diferença: positiva = reserva sobrando, negativa = reserva curta. */
  folgaPorKm: number | null;
  status: 'suficiente' | 'justa' | 'insuficiente' | 'sem_dados';
}

export function avaliarCoberturaReserva(
  reservadoPorKm: number | null,
  custoRealPorKm: number | null,
): CoberturaReserva {
  if (reservadoPorKm === null || custoRealPorKm === null || custoRealPorKm <= 0) {
    return { reservadoPorKm, custoRealPorKm, folgaPorKm: null, status: 'sem_dados' };
  }

  const folgaPorKm = money(reservadoPorKm - custoRealPorKm);
  const razao = reservadoPorKm / custoRealPorKm;

  const status: CoberturaReserva['status'] =
    razao >= 1.1 ? 'suficiente' : razao >= 0.95 ? 'justa' : 'insuficiente';

  return { reservadoPorKm, custoRealPorKm, folgaPorKm, status };
}
