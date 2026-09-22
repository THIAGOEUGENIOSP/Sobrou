import { describe, expect, it } from 'vitest';
import { ALLOCATION_PADRAO } from '../src/allocation';
import { conferirFechamento, fecharTurno } from '../src/closing';
import { consumoReal, precoReferencia } from '../src/fuel';
import {
  formatConsumo,
  formatHoras,
  formatKm,
  formatMoney,
  formatRate,
  formatVariacao,
} from '../src/format';
import { saldoReserva } from '../src/reserves';
import type { FuelEntry, ReserveMovement } from '../src/types';

/**
 * Teste de ponta a ponta do fechamento diário (seção 12): sai do histórico de
 * abastecimentos, passa pelo turno e chega no "VALOR DISPONÍVEL" da tela.
 */
describe('fechamento diário, do abastecimento ao valor disponível', () => {
  const abastecimentos: FuelEntry[] = [
    {
      id: '1',
      filledAt: '2026-09-10T08:00:00Z',
      fuelKind: 'etanol',
      litros: 40,
      valorBruto: 164,
      desconto: 0,
      cashback: 0,
      valorPago: 164,
      odometro: 9600,
      tanqueCheio: true,
    },
    {
      id: '2',
      filledAt: '2026-09-20T08:00:00Z',
      fuelKind: 'etanol',
      litros: 34.71,
      valorBruto: 145.43,
      desconto: 10,
      cashback: 0,
      valorPago: 135.43,
      odometro: 9933.2,
      tanqueCheio: true,
    },
  ];

  it('mede o consumo real do veículo em 9,6 km/L', () => {
    // 333,2 km com 34,71 L
    expect(consumoReal(abastecimentos)).toBe(9.6);
  });

  it('usa o preço efetivo do último abastecimento como referência', () => {
    const preco = precoReferencia(abastecimentos, {
      modo: 'ultimo',
      fuelKind: 'etanol',
      referencia: '2026-09-21T06:00:00Z',
    });
    expect(preco).toBe(3.9018);
  });

  it('fecha o dia com todos os números da tela de resumo', () => {
    const consumo = consumoReal(abastecimentos)!;
    const preco = precoReferencia(abastecimentos, {
      modo: 'ultimo',
      referencia: '2026-09-21T06:00:00Z',
    })!;

    const f = fecharTurno(
      {
        startedAt: '2026-09-21T08:00:00Z',
        endedAt: '2026-09-21T12:00:00Z',
        odoInicial: 9933.2,
        odoFinal: 9975.2,
        consumo,
        precoCombustivel: preco,
        fuelKind: 'etanol',
        receitas: [
          { categoryId: 'uber', categoryName: 'Uber', valor: 250, qtdCorridas: 12 },
          { categoryId: '99', categoryName: '99', valor: 80, qtdCorridas: 4 },
        ],
        despesas: [20],
      },
      ALLOCATION_PADRAO,
    );

    expect(f.turno.km).toBe(42);
    expect(f.turno.horas).toBe(4);
    expect(f.turno.litros).toBe(4.375);
    expect(f.turno.custoCombustivel).toBe(17.07);
    expect(f.turno.faturamento).toBe(330);
    expect(f.turno.outrasDespesas).toBe(20);
    expect(f.turno.resultadoOperacional).toBe(292.93);
    expect(f.snapshot.reservaVeiculo).toBe(58.59);
    expect(f.snapshot.reservaEmergencia).toBe(29.29);
    expect(f.snapshot.disponivel).toBe(205.05);
  });

  it('a distribuição sempre fecha com a base', () => {
    const f = fecharTurno(
      {
        startedAt: '2026-09-21T08:00:00Z',
        endedAt: '2026-09-21T12:00:00Z',
        odoInicial: 9933.2,
        odoFinal: 9975.2,
        consumo: 9.6,
        precoCombustivel: 3.9018,
        receitas: [{ categoryId: 'uber', valor: 330 }],
        despesas: [20],
      },
      ALLOCATION_PADRAO,
    );
    expect(conferirFechamento(f)).toEqual({ ok: true, diferenca: 0 });
  });

  it('gera exatamente os créditos que vão para o livro-razão', () => {
    const f = fecharTurno(
      {
        startedAt: '2026-09-21T08:00:00Z',
        endedAt: '2026-09-21T12:00:00Z',
        odoInicial: 9933.2,
        odoFinal: 9975.2,
        consumo: 9.6,
        precoCombustivel: 3.9018,
        receitas: [{ categoryId: 'uber', valor: 330 }],
        despesas: [20],
      },
      ALLOCATION_PADRAO,
    );

    expect(f.creditosReserva).toEqual([
      { reserveKind: 'veiculo', valor: 58.59 },
      { reserveKind: 'emergencia', valor: 29.29 },
    ]);

    // Somando esse crédito ao que já havia, e gastando 350 na troca de óleo,
    // chega-se ao exemplo da seção 8.
    const movimentos: ReserveMovement[] = [
      { reserveKind: 'veiculo', direction: 'credito', valor: 1441.41 },
      ...f.creditosReserva.map((c) => ({
        reserveKind: c.reserveKind,
        direction: 'credito' as const,
        valor: c.valor,
      })),
      { reserveKind: 'veiculo', direction: 'debito', valor: 350 },
    ];

    const saldo = saldoReserva(movimentos, 'veiculo');
    expect(saldo.totalReservado).toBe(1500);
    expect(saldo.totalGasto).toBe(350);
    expect(saldo.saldo).toBe(1150);
  });

  it('dia de prejuízo não gera crédito de reserva', () => {
    const f = fecharTurno(
      {
        startedAt: '2026-09-21T08:00:00Z',
        endedAt: '2026-09-21T12:00:00Z',
        odoInicial: 9933.2,
        odoFinal: 9975.2,
        consumo: 9.6,
        precoCombustivel: 3.9018,
        receitas: [{ categoryId: 'uber', valor: 10 }],
        despesas: [60],
      },
      ALLOCATION_PADRAO,
    );

    expect(f.distribuicao.prejuizo).toBe(true);
    expect(f.creditosReserva).toEqual([]);
    expect(f.snapshot.disponivel).toBeLessThan(0);
    expect(conferirFechamento(f).ok).toBe(true);
  });
});

describe('formatação pt-BR na tela de resumo', () => {
  it('formata dinheiro, taxas e tempo', () => {
    expect(formatMoney(205.05)).toBe('R$ 205,05');
    expect(formatRate(0.41, 'km')).toBe('R$ 0,41/km');
    expect(formatKm(42)).toBe('42,0 km');
    expect(formatConsumo(9.6)).toBe('9,6 km/L');
    expect(formatHoras(4.25)).toBe('4h15');
    expect(formatHoras(4)).toBe('4h');
    expect(formatVariacao(15.56)).toBe('+15,56%');
    expect(formatVariacao(-13.46)).toBe('-13,46%');
  });

  it('mostra travessão onde não há resposta, nunca zero', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatRate(null, 'km')).toBe('—');
    expect(formatConsumo(null)).toBe('—');
    expect(formatVariacao(null)).toBe('—');
  });
});
