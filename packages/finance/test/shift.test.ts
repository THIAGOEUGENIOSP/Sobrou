import { describe, expect, it } from 'vitest';
import {
  calcularTurno,
  custoCombustivelEstimado,
  faturamentoTotal,
  kmRodados,
  litrosEstimados,
  segundosTrabalhados,
  type ShiftInput,
} from '../src/shift';

describe('exemplo real do enunciado (seção 5)', () => {
  // 42 km, consumo 9,6 km/L, etanol a ~R$ 3,90/L
  it('calcula 4,375 litros', () => {
    expect(litrosEstimados(42, 9.6)).toBe(4.375);
  });

  it('calcula custo de aproximadamente R$ 17,06', () => {
    expect(custoCombustivelEstimado(42, 9.6, 3.9)).toBe(17.06);
  });

  it('calcula custo de combustível de aproximadamente R$ 0,41/km', () => {
    const turno = calcularTurno({
      startedAt: '2026-09-21T08:00:00Z',
      endedAt: '2026-09-21T12:00:00Z',
      odoInicial: 10000,
      odoFinal: 10042,
      consumo: 9.6,
      precoCombustivel: 3.9,
      receitas: [{ categoryId: 'uber', valor: 330 }],
    });

    expect(turno.km).toBe(42);
    expect(turno.litros).toBe(4.375);
    expect(turno.custoCombustivel).toBe(17.06);
    expect(turno.combustivelPorKm).toBeCloseTo(0.41, 2);
  });
});

describe('quilometragem e horas', () => {
  it('calcula km pela diferença de hodômetro', () => {
    expect(kmRodados(10000, 10042)).toBe(42);
  });

  it('nunca devolve km negativo', () => {
    expect(kmRodados(10042, 10000)).toBe(0);
  });

  it('não propaga erro de arredondamento no R$/hora', () => {
    // 3h20 = 3,3333… h. Dividir pelo valor arredondado erraria o centavo.
    const t = calcularTurno({
      startedAt: '2026-09-21T06:00:00Z',
      endedAt: '2026-09-21T09:20:00Z',
      odoInicial: 0,
      odoFinal: 100,
      consumo: 10,
      precoCombustivel: 4,
      receitas: [{ categoryId: 'uber', valor: 200 }],
    });
    expect(t.horas).toBe(3.3333);
    expect(t.faturamentoPorHora).toBe(60);
  });

  it('calcula horas trabalhadas', () => {
    const t = calcularTurno({
      startedAt: '2026-09-21T06:00:00Z',
      endedAt: '2026-09-21T14:30:00Z',
      odoInicial: 0,
      odoFinal: 200,
      consumo: 10,
      precoCombustivel: 4,
      receitas: [{ categoryId: 'uber', valor: 400 }],
    });
    expect(t.horas).toBe(8.5);
    expect(t.faturamentoPorHora).toBe(47.06);
  });
});

describe('faturamento por plataforma (seção 6)', () => {
  const input: ShiftInput = {
    startedAt: '2026-09-21T08:00:00Z',
    endedAt: '2026-09-21T12:00:00Z',
    odoInicial: 10000,
    odoFinal: 10042,
    consumo: 9.6,
    precoCombustivel: 3.9,
    receitas: [
      { categoryId: 'uber', categoryName: 'Uber', valor: 250, qtdCorridas: 12 },
      { categoryId: '99', categoryName: '99', valor: 80, qtdCorridas: 4 },
    ],
    despesas: [20],
  };

  it('soma todas as plataformas', () => {
    expect(faturamentoTotal(input.receitas)).toBe(330);
  });

  it('separa faturamento, custos e resultado operacional', () => {
    const t = calcularTurno(input);
    expect(t.faturamento).toBe(330);
    expect(t.custoCombustivel).toBe(17.06);
    expect(t.outrasDespesas).toBe(20);
    expect(t.resultadoOperacional).toBe(292.94);
  });

  it('calcula os indicadores por km e por hora', () => {
    const t = calcularTurno(input);
    expect(t.faturamentoPorKm).toBe(7.8571);
    expect(t.faturamentoPorHora).toBe(82.5);
    expect(t.resultadoPorKm).toBe(6.9748);
  });

  it('rateia a participação de cada plataforma', () => {
    const t = calcularTurno(input);
    expect(t.porPlataforma[0]!.participacao).toBe(75.76);
    expect(t.porPlataforma[1]!.participacao).toBe(24.24);
  });

  it('soma as corridas e calcula o ticket médio', () => {
    const t = calcularTurno(input);
    expect(t.qtdCorridas).toBe(16);
    expect(t.valorMedioPorCorrida).toBe(20.63);
  });
});

describe('custo de combustível medido x estimado', () => {
  const base: ShiftInput = {
    startedAt: '2026-09-21T08:00:00Z',
    endedAt: '2026-09-21T12:00:00Z',
    odoInicial: 10000,
    odoFinal: 10042,
    consumo: 9.6,
    precoCombustivel: 3.9,
    receitas: [{ categoryId: 'uber', valor: 330 }],
  };

  it('usa a estimativa quando não houve abastecimento no turno', () => {
    const t = calcularTurno(base);
    expect(t.custoCombustivelMedido).toBe(false);
    expect(t.custoCombustivel).toBe(17.06);
  });

  it('prefere o abastecimento real quando existe', () => {
    const t = calcularTurno({ ...base, custoCombustivelReal: 22.5 });
    expect(t.custoCombustivelMedido).toBe(true);
    expect(t.custoCombustivel).toBe(22.5);
    expect(t.resultadoOperacional).toBe(307.5);
  });
});

describe('nenhuma divisão por zero chega à tela', () => {
  it('turno sem km rodado devolve null, não zero', () => {
    const t = calcularTurno({
      startedAt: '2026-09-21T08:00:00Z',
      endedAt: '2026-09-21T09:00:00Z',
      odoInicial: 10000,
      odoFinal: 10000,
      consumo: 9.6,
      precoCombustivel: 3.9,
      receitas: [{ categoryId: 'uber', valor: 30 }],
    });
    expect(t.km).toBe(0);
    expect(t.faturamentoPorKm).toBeNull();
    expect(t.combustivelPorKm).toBeNull();
  });

  it('turno sem duração devolve null por hora', () => {
    const t = calcularTurno({
      startedAt: '2026-09-21T08:00:00Z',
      endedAt: '2026-09-21T08:00:00Z',
      odoInicial: 10000,
      odoFinal: 10010,
      consumo: 9.6,
      precoCombustivel: 3.9,
      receitas: [{ categoryId: 'uber', valor: 30 }],
    });
    expect(t.horas).toBe(0);
    expect(t.faturamentoPorHora).toBeNull();
  });

  it('consumo zero não quebra o cálculo', () => {
    const t = calcularTurno({
      startedAt: '2026-09-21T08:00:00Z',
      endedAt: '2026-09-21T12:00:00Z',
      odoInicial: 10000,
      odoFinal: 10042,
      consumo: 0,
      precoCombustivel: 3.9,
      receitas: [{ categoryId: 'uber', valor: 330 }],
    });
    expect(t.litros).toBeNull();
    expect(t.custoCombustivel).toBe(0);
  });

  it('turno sem corrida informada não inventa ticket médio', () => {
    const t = calcularTurno({
      startedAt: '2026-09-21T08:00:00Z',
      endedAt: '2026-09-21T12:00:00Z',
      odoInicial: 10000,
      odoFinal: 10042,
      consumo: 9.6,
      precoCombustivel: 3.9,
      receitas: [{ categoryId: 'uber', valor: 330 }],
    });
    expect(t.qtdCorridas).toBeNull();
    expect(t.valorMedioPorCorrida).toBeNull();
  });
});

describe('segundosTrabalhados', () => {
  it('conta o tempo cheio quando não houve pausa', () => {
    const s = segundosTrabalhados(
      '2026-09-21T08:00:00Z',
      '2026-09-21T09:00:00Z',
      0,
      null,
    );
    expect(s).toBe(3600);
  });

  it('desconta pausas já concluídas', () => {
    const s = segundosTrabalhados(
      '2026-09-21T08:00:00Z',
      '2026-09-21T09:00:00Z',
      600, // 10 minutos já pausados antes
      null,
    );
    expect(s).toBe(3000);
  });

  it('desconta a pausa em andamento agora', () => {
    const s = segundosTrabalhados(
      '2026-09-21T08:00:00Z',
      '2026-09-21T09:00:00Z',
      0,
      '2026-09-21T08:45:00Z', // pausou faltando 15 minutos
    );
    expect(s).toBe(2700);
  });

  it('soma pausas concluídas e a pausa em andamento', () => {
    const s = segundosTrabalhados(
      '2026-09-21T08:00:00Z',
      '2026-09-21T09:00:00Z',
      300,
      '2026-09-21T08:50:00Z',
    );
    // 3600 - 300 (pausa anterior) - 600 (pausa em andamento) = 2700
    expect(s).toBe(2700);
  });

  it('nunca fica negativo, mesmo com pausas maiores que o turno', () => {
    const s = segundosTrabalhados(
      '2026-09-21T08:00:00Z',
      '2026-09-21T08:30:00Z',
      3600,
      null,
    );
    expect(s).toBe(0);
  });
});
