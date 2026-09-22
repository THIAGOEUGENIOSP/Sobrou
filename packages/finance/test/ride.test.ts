import { describe, expect, it } from 'vitest';
import { avaliarCorrida, valorMinimoAceitavel, type RideRules } from '../src/ride';

const regras: RideRules = {
  valorMin: 8,
  rsKmMin: 1.8,
  rsHoraMin: 35,
  distMaxBusca: 3,
  notaMin: 4.7,
};

describe('analisador de corridas (seção 11)', () => {
  it('soma o deslocamento até o passageiro no km total', () => {
    const r = avaliarCorrida(
      { valor: 22, kmBusca: 2, kmViagem: 8, minBusca: 5, minViagem: 15 },
      {},
      0.41,
    );
    expect(r.kmTotal).toBe(10);
    expect(r.minutosTotal).toBe(20);
    expect(r.rsKm).toBe(2.2);
    expect(r.rsHora).toBe(66);
  });

  it('não propaga erro de arredondamento no R$/hora', () => {
    // 20 min arredondados para 0,3333 h dariam R$ 66,01/h; o certo é R$ 66,00/h.
    const vinteMin = avaliarCorrida({ valor: 22, kmBusca: 2, kmViagem: 8, minBusca: 5, minViagem: 15 });
    expect(vinteMin.rsHora).toBe(66);

    // 50 min: 35 × 60 / 50 = R$ 42,00/h
    const cinquentaMin = avaliarCorrida({ valor: 35, kmBusca: 3, kmViagem: 17, minBusca: 10, minViagem: 40 });
    expect(cinquentaMin.rsHora).toBe(42);
  });

  it('estima custo e margem pelo custo por km do veículo', () => {
    const r = avaliarCorrida(
      { valor: 22, kmBusca: 2, kmViagem: 8, minBusca: 5, minViagem: 15 },
      {},
      1.03,
    );
    expect(r.custoEstimado).toBe(10.3);
    expect(r.margemEstimada).toBe(11.7);
  });

  it('aceita a corrida quando todas as regras passam', () => {
    const r = avaliarCorrida(
      { valor: 22, kmBusca: 2, kmViagem: 8, minBusca: 5, minViagem: 15, notaPassageiro: 4.9 },
      regras,
      0.41,
    );
    expect(r.veredito).toBe('aceitar');
    expect(r.motivos).toEqual([]);
  });

  it('recusa e diz exatamente qual regra falhou', () => {
    const r = avaliarCorrida(
      { valor: 9, kmBusca: 6, kmViagem: 4, minBusca: 18, minViagem: 12, notaPassageiro: 4.9 },
      regras,
      0.41,
    );

    expect(r.veredito).toBe('recusar');
    // R$/km = 0,90 ; busca 6 km acima do limite de 3 km ; R$/h = 18
    expect(r.motivos).toHaveLength(3);
    expect(r.motivos.join(' ')).toContain('km');
    expect(r.criterios.find((c) => c.regra === 'distancia_maxima_busca')?.atende).toBe(false);
    expect(r.criterios.find((c) => c.regra === 'valor_minimo')?.atende).toBe(true);
  });

  it('a corrida longa até o passageiro é justamente a que não compensa', () => {
    const curta = avaliarCorrida(
      { valor: 15, kmBusca: 1, kmViagem: 9, minBusca: 3, minViagem: 18 },
      {},
      0.41,
    );
    const longa = avaliarCorrida(
      { valor: 15, kmBusca: 9, kmViagem: 9, minBusca: 22, minViagem: 18 },
      {},
      0.41,
    );

    expect(curta.rsKm!).toBeGreaterThan(longa.rsKm!);
    expect(longa.proporcaoBusca).toBe(50);
    expect(longa.margemEstimada!).toBeLessThan(curta.margemEstimada!);
  });

  it('reprova corrida com prejuízo mesmo sem regra cadastrada', () => {
    const r = avaliarCorrida(
      { valor: 6, kmBusca: 5, kmViagem: 5, minBusca: 12, minViagem: 12 },
      {},
      1.03,
    );
    expect(r.margemEstimada).toBe(-4.3);
    expect(r.veredito).toBe('recusar');
    expect(r.motivos[0]).toContain('prejuízo');
  });

  it('avisa quando a nota do passageiro não veio', () => {
    const r = avaliarCorrida(
      { valor: 22, kmBusca: 2, kmViagem: 8, minBusca: 5, minViagem: 15 },
      { notaMin: 4.7 },
      null,
    );
    expect(r.veredito).toBe('recusar');
    expect(r.motivos[0]).toContain('não informada');
  });

  it('sem regras e sem custo por km, não finge ter opinião', () => {
    const r = avaliarCorrida({ valor: 22, kmBusca: 2, kmViagem: 8, minBusca: 5, minViagem: 15 });
    expect(r.veredito).toBe('indefinido');
    expect(r.custoEstimado).toBeNull();
  });

  it('não divide por zero em corrida sem distância', () => {
    const r = avaliarCorrida({ valor: 10, kmBusca: 0, kmViagem: 0, minBusca: 0, minViagem: 0 });
    expect(r.rsKm).toBeNull();
    expect(r.rsHora).toBeNull();
  });
});

describe('valor mínimo aceitável', () => {
  it('usa a regra mais exigente entre todas', () => {
    // 10 km × R$ 1,80 = R$ 18 ; 0,5 h × R$ 35 = R$ 17,50 ; mínimo fixo R$ 8
    expect(valorMinimoAceitavel(10, 30, regras)).toBe(18);
  });

  it('considera a margem mínima somada ao custo', () => {
    expect(valorMinimoAceitavel(10, 30, { margemMin: 12 }, 1.03)).toBe(22.3);
  });

  it('sem regras, pede ao menos o custo estimado', () => {
    expect(valorMinimoAceitavel(10, 30, {}, 1.03)).toBe(10.3);
  });

  it('devolve null quando não há base nenhuma', () => {
    expect(valorMinimoAceitavel(10, 30, {}, null)).toBeNull();
  });
});
