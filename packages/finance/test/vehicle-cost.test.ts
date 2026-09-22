import { describe, expect, it } from 'vitest';
import {
  custoCobertoPelaReservaPorKm,
  custoTotalPorKm,
  depreciacaoPorKm,
  fixosPorKm,
  manutencaoPorKm,
  seguroPorKm,
} from '../src/vehicle-cost';
import type { VehicleCostBasis } from '../src/types';

const polo: VehicleCostBasis = {
  valorCompra: 95000,
  valorResidualEstimado: 35000,
  vidaUtilKm: 200000,
  seguroMensal: 380,
  custosFixosMensais: 250,
  kmMedioMensal: 3000,
};

describe('componentes do custo por km (seção 10)', () => {
  it('depreciação: (95.000 − 35.000) / 200.000 km', () => {
    expect(depreciacaoPorKm(polo)).toBe(0.3);
  });

  it('seguro: 380 / 3.000 km', () => {
    expect(seguroPorKm(polo)).toBe(0.1267);
  });

  it('custos fixos: 250 / 3.000 km', () => {
    expect(fixosPorKm(polo)).toBe(0.0833);
  });

  it('manutenção pelo histórico de 12 meses', () => {
    expect(manutencaoPorKm(4200, 36000)).toBe(0.1167);
  });

  it('cai na estimativa manual enquanto não há histórico', () => {
    expect(manutencaoPorKm(null, null, 0.12)).toBe(0.12);
    expect(manutencaoPorKm(0, 0, 0.12)).toBe(0.12);
  });

  it('sem histórico nem estimativa, devolve null em vez de zero', () => {
    expect(manutencaoPorKm(null, null)).toBeNull();
  });

  it('não calcula depreciação sem vida útil', () => {
    expect(depreciacaoPorKm({ valorCompra: 95000, vidaUtilKm: null })).toBeNull();
  });
});

describe('custo total por km', () => {
  it('soma todos os componentes disponíveis', () => {
    const b = custoTotalPorKm({
      combustivelPorKm: 0.4063,
      basis: polo,
      totalManutencoes12m: 4200,
      kmRodados12m: 36000,
    });

    expect(b.combustivel).toBe(0.4063);
    expect(b.manutencao).toBe(0.1167);
    expect(b.depreciacao).toBe(0.3);
    expect(b.seguro).toBe(0.1267);
    expect(b.fixos).toBe(0.0833);
    expect(b.total).toBe(1.033);
    expect(b.faltando).toEqual([]);
  });

  it('é muito maior que só o combustível por km', () => {
    const b = custoTotalPorKm({
      combustivelPorKm: 0.4063,
      basis: polo,
      totalManutencoes12m: 4200,
      kmRodados12m: 36000,
    });
    expect(b.total).toBeGreaterThan((b.combustivel as number) * 2);
  });

  it('avisa quais componentes ficaram sem dado em vez de tratá-los como zero', () => {
    const b = custoTotalPorKm({
      combustivelPorKm: 0.4,
      basis: { valorCompra: null, vidaUtilKm: null, seguroMensal: null, kmMedioMensal: null },
    });

    expect(b.total).toBe(0.4);
    expect(b.faltando).toEqual(['manutencao', 'depreciacao', 'seguro', 'fixos']);
  });

  it('sem nenhum dado, não inventa total', () => {
    const b = custoTotalPorKm({ combustivelPorKm: null, basis: {} });
    expect(b.total).toBeNull();
  });
});

describe('coerência com a reserva do veículo', () => {
  it('a reserva cobre manutenção e depreciação, não o combustível', () => {
    const b = custoTotalPorKm({
      combustivelPorKm: 0.4063,
      basis: polo,
      totalManutencoes12m: 4200,
      kmRodados12m: 36000,
    });

    // 0,1167 + 0,30 — o combustível já saiu do bolso no dia e não entra aqui,
    // senão o custo seria contado duas vezes.
    expect(custoCobertoPelaReservaPorKm(b)).toBe(0.4167);
  });
});
