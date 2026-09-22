import { describe, expect, it } from 'vitest';
import {
  avaliarCoberturaReserva,
  mesesDeFolga,
  saldoReserva,
  saldosReservas,
} from '../src/reserves';
import type { ReserveMovement } from '../src/types';

describe('reserva x gasto real (seção 8)', () => {
  it('reproduz o exemplo: reserva 1.500, óleo 350, saldo 1.150', () => {
    const movimentos: ReserveMovement[] = [
      { reserveKind: 'veiculo', direction: 'credito', valor: 1500 },
      { reserveKind: 'veiculo', direction: 'debito', valor: 350 },
    ];

    const s = saldoReserva(movimentos, 'veiculo');
    expect(s.totalReservado).toBe(1500);
    expect(s.totalGasto).toBe(350);
    expect(s.saldo).toBe(1150);
  });

  it('dinheiro reservado não é dinheiro gasto', () => {
    // Sem nenhum débito, tudo que foi separado continua disponível na reserva.
    const movimentos: ReserveMovement[] = Array.from({ length: 30 }, () => ({
      reserveKind: 'veiculo' as const,
      direction: 'credito' as const,
      valor: 50,
    }));

    const s = saldoReserva(movimentos, 'veiculo');
    expect(s.totalReservado).toBe(1500);
    expect(s.totalGasto).toBe(0);
    expect(s.saldo).toBe(1500);
  });

  it('mantém as duas reservas separadas', () => {
    const movimentos: ReserveMovement[] = [
      { reserveKind: 'veiculo', direction: 'credito', valor: 1500 },
      { reserveKind: 'veiculo', direction: 'debito', valor: 350 },
      { reserveKind: 'emergencia', direction: 'credito', valor: 800 },
      { reserveKind: 'emergencia', direction: 'debito', valor: 120 },
    ];

    const s = saldosReservas(movimentos);
    expect(s.veiculo.saldo).toBe(1150);
    expect(s.emergencia.saldo).toBe(680);
  });

  it('acumula centavos sem erro de ponto flutuante', () => {
    const movimentos: ReserveMovement[] = Array.from({ length: 100 }, () => ({
      reserveKind: 'emergencia' as const,
      direction: 'credito' as const,
      valor: 0.1,
    }));
    expect(saldoReserva(movimentos, 'emergencia').saldo).toBe(10);
  });

  it('aceita saldo negativo quando se gastou mais do que havia', () => {
    const movimentos: ReserveMovement[] = [
      { reserveKind: 'veiculo', direction: 'credito', valor: 100 },
      { reserveKind: 'veiculo', direction: 'debito', valor: 350 },
    ];
    expect(saldoReserva(movimentos, 'veiculo').saldo).toBe(-250);
  });

  it('lista vazia devolve zero, não erro', () => {
    expect(saldoReserva([], 'veiculo').saldo).toBe(0);
  });
});

describe('folga da reserva de emergência', () => {
  it('converte saldo em meses de custo fixo', () => {
    expect(mesesDeFolga(3000, 1200)).toBe(2.5);
  });

  it('sem custo mensal informado não há resposta', () => {
    expect(mesesDeFolga(3000, 0)).toBeNull();
  });
});

describe('a reserva do veículo cobre o custo real?', () => {
  it('avisa quando o percentual está subdimensionado', () => {
    // Reservando R$ 0,30/km para um custo real de R$ 0,45/km
    const c = avaliarCoberturaReserva(0.3, 0.45);
    expect(c.status).toBe('insuficiente');
    expect(c.folgaPorKm).toBe(-0.15);
  });

  it('reconhece reserva folgada', () => {
    expect(avaliarCoberturaReserva(0.6, 0.45).status).toBe('suficiente');
  });

  it('reconhece reserva justa', () => {
    expect(avaliarCoberturaReserva(0.44, 0.45).status).toBe('justa');
  });

  it('não opina sem dados', () => {
    expect(avaliarCoberturaReserva(null, 0.45).status).toBe('sem_dados');
    expect(avaliarCoberturaReserva(0.3, null).status).toBe('sem_dados');
  });
});
