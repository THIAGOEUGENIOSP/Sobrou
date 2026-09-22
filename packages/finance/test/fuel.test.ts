import { describe, expect, it } from 'vitest';
import {
  compararCombustiveis,
  consumoPorTanque,
  consumoReal,
  custoEfetivo,
  economiaNoAbastecimento,
  precoEfetivoLitro,
  precoRealLitro,
  precoReferencia,
  valorPagoSugerido,
} from '../src/fuel';
import type { FuelEntry } from '../src/types';

function abastecimento(over: Partial<FuelEntry> & { id: string }): FuelEntry {
  return {
    filledAt: '2026-09-01T10:00:00Z',
    fuelKind: 'etanol',
    litros: 40,
    valorBruto: 160,
    desconto: 0,
    cashback: 0,
    valorPago: 160,
    odometro: null,
    tanqueCheio: true,
    ...over,
  };
}

describe('preço real por litro (seção 3)', () => {
  it('reproduz o exemplo do enunciado: 34,71 L, bruto 145,43, desconto 10', () => {
    // Preço anunciado na placa: R$ 4,19/L. É ignorado de propósito.
    const entry = abastecimento({
      id: 'e1',
      litros: 34.71,
      valorBruto: 145.43,
      desconto: 10,
      valorPago: 135.43,
    });

    // O sistema considera os R$ 135,43 como custo real, não os R$ 145,43.
    expect(precoRealLitro(entry)).toBe(3.9018);
    expect(precoRealLitro(entry)).toBeCloseTo(3.9, 2);
  });

  it('o valor pago sugerido é bruto menos desconto', () => {
    expect(valorPagoSugerido(145.43, 10)).toBe(135.43);
    expect(valorPagoSugerido(145.43)).toBe(145.43);
  });

  it('mostra a economia do abastecimento', () => {
    const entry = abastecimento({ id: 'e1', desconto: 10, cashback: 5 });
    expect(economiaNoAbastecimento(entry)).toBe(15);
  });

  it('nunca divide por zero litro', () => {
    expect(precoRealLitro({ valorPago: 100, litros: 0 })).toBeNull();
  });
});

describe('cashback configurável', () => {
  const entry = abastecimento({
    id: 'e1',
    litros: 40,
    valorBruto: 200,
    desconto: 0,
    cashback: 20,
    valorPago: 200,
  });

  it('abatendo do custo, o litro fica mais barato', () => {
    expect(custoEfetivo(entry, true)).toBe(180);
    expect(precoEfetivoLitro(entry, true)).toBe(4.5);
  });

  it('como receita à parte, o custo do combustível não muda', () => {
    expect(custoEfetivo(entry, false)).toBe(200);
    expect(precoEfetivoLitro(entry, false)).toBe(5);
  });
});

describe('consumo real medido entre tanques cheios (seção 16)', () => {
  const entries: FuelEntry[] = [
    abastecimento({ id: '1', filledAt: '2026-09-01T10:00:00Z', odometro: 10000, litros: 40 }),
    abastecimento({ id: '2', filledAt: '2026-09-05T10:00:00Z', odometro: 10400, litros: 40 }),
    abastecimento({ id: '3', filledAt: '2026-09-10T10:00:00Z', odometro: 10800, litros: 42 }),
  ];

  it('mede cada trecho separadamente', () => {
    const segs = consumoPorTanque(entries);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.km).toBe(400);
    expect(segs[0]!.litros).toBe(40);
    expect(segs[0]!.consumo).toBe(10);
    expect(segs[1]!.consumo).toBe(9.524);
  });

  it('pondera pelos litros, não faz média de médias', () => {
    // (400 + 400) / (40 + 42) = 9,756…  — média simples daria 9,762
    expect(consumoReal(entries)).toBe(9.76);
  });

  it('inclui abastecimento parcial nos litros do trecho', () => {
    const comParcial: FuelEntry[] = [
      abastecimento({ id: '1', filledAt: '2026-09-01T10:00:00Z', odometro: 10000, litros: 40 }),
      abastecimento({
        id: 'p',
        filledAt: '2026-09-03T10:00:00Z',
        odometro: 10200,
        litros: 20,
        tanqueCheio: false,
      }),
      abastecimento({ id: '2', filledAt: '2026-09-05T10:00:00Z', odometro: 10400, litros: 22 }),
    ];
    const segs = consumoPorTanque(comParcial);
    expect(segs).toHaveLength(1);
    expect(segs[0]!.km).toBe(400);
    expect(segs[0]!.litros).toBe(42);
  });

  it('separa o consumo por combustível', () => {
    const misto: FuelEntry[] = [
      abastecimento({ id: '1', filledAt: '2026-09-01T10:00:00Z', odometro: 10000, fuelKind: 'etanol' }),
      abastecimento({
        id: '2',
        filledAt: '2026-09-05T10:00:00Z',
        odometro: 10400,
        litros: 40,
        fuelKind: 'etanol',
      }),
      abastecimento({
        id: '3',
        filledAt: '2026-09-10T10:00:00Z',
        odometro: 10940,
        litros: 40,
        fuelKind: 'gasolina',
      }),
    ];
    expect(consumoReal(misto, { fuelKind: 'etanol' })).toBe(10);
    expect(consumoReal(misto, { fuelKind: 'gasolina' })).toBe(13.5);
  });

  it('devolve null quando não há trecho fechado', () => {
    expect(consumoReal([abastecimento({ id: '1', odometro: 10000 })])).toBeNull();
    expect(consumoReal([])).toBeNull();
  });

  it('ignora abastecimento sem hodômetro como fechamento de trecho', () => {
    const semOdo: FuelEntry[] = [
      abastecimento({ id: '1', filledAt: '2026-09-01T10:00:00Z', odometro: 10000, litros: 40 }),
      abastecimento({ id: '2', filledAt: '2026-09-03T10:00:00Z', odometro: null, litros: 10 }),
      abastecimento({ id: '3', filledAt: '2026-09-05T10:00:00Z', odometro: 10400, litros: 30 }),
    ];
    const segs = consumoPorTanque(semOdo);
    expect(segs).toHaveLength(1);
    expect(segs[0]!.litros).toBe(40);
  });
});

describe('preço de referência do combustível', () => {
  const entries: FuelEntry[] = [
    abastecimento({
      id: '1',
      filledAt: '2026-09-01T10:00:00Z',
      litros: 40,
      valorBruto: 160,
      valorPago: 160,
    }),
    abastecimento({
      id: '2',
      filledAt: '2026-09-15T10:00:00Z',
      litros: 30,
      valorBruto: 120,
      valorPago: 117,
      desconto: 3,
    }),
  ];

  it('modo "último" usa o preço efetivo do último abastecimento', () => {
    expect(precoReferencia(entries, { modo: 'ultimo', referencia: '2026-09-20T00:00:00Z' })).toBe(3.9);
  });

  it('modo "média ponderada" pondera pelos litros', () => {
    // (160 + 117) / (40 + 30) = 3,9571…
    expect(
      precoReferencia(entries, {
        modo: 'media_ponderada_30d',
        referencia: '2026-09-20T00:00:00Z',
      }),
    ).toBe(3.9571);
  });

  it('ignora abastecimentos posteriores à data de referência', () => {
    expect(precoReferencia(entries, { modo: 'ultimo', referencia: '2026-09-10T00:00:00Z' })).toBe(4);
  });

  it('cai no último abastecimento quando a janela de 30 dias está vazia', () => {
    expect(
      precoReferencia(entries, {
        modo: 'media_ponderada_30d',
        referencia: '2026-12-31T00:00:00Z',
      }),
    ).toBe(3.9);
  });

  it('devolve null sem histórico', () => {
    expect(precoReferencia([], {})).toBeNull();
  });
});

describe('etanol x gasolina pelo consumo real (seção 16)', () => {
  it('decide por custo por km, não pela regra dos 70%', () => {
    const r = compararCombustiveis([
      { fuelKind: 'etanol', preco: 3.9, consumo: 9.6 },
      { fuelKind: 'gasolina', preco: 5.6, consumo: 13.5 },
    ]);

    expect(r.opcoes[0]!.custoPorKm).toBe(0.4063); // 3,90 / 9,6
    expect(r.opcoes[1]!.custoPorKm).toBe(0.4148); // 5,60 / 13,5
    expect(r.vencedor).toBe('etanol');
    expect(r.economiaPorKm).toBe(0.0085);
  });

  it('mostra a paridade real do veículo no lugar dos 70% genéricos', () => {
    const r = compararCombustiveis([
      { fuelKind: 'etanol', preco: 3.9, consumo: 9.6 },
      { fuelKind: 'gasolina', preco: 5.6, consumo: 13.5 },
    ]);
    expect(r.paridadeReal).toBe(0.7111);
  });

  it('a gasolina ganha quando o etanol está caro', () => {
    const r = compararCombustiveis([
      { fuelKind: 'etanol', preco: 4.5, consumo: 9.6 },
      { fuelKind: 'gasolina', preco: 5.6, consumo: 13.5 },
    ]);
    expect(r.vencedor).toBe('gasolina');
  });

  it('compara três combustíveis', () => {
    const r = compararCombustiveis([
      { fuelKind: 'etanol', preco: 3.9, consumo: 9.6 },
      { fuelKind: 'gasolina', preco: 5.6, consumo: 13.5 },
      { fuelKind: 'gnv', preco: 4.2, consumo: 16 },
    ]);
    expect(r.vencedor).toBe('gnv');
  });
});
