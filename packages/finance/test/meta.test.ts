import { describe, expect, it } from 'vitest';
import {
  alertasDoDia,
  avaliarDia,
  datasPlanejadas,
  farol,
  lucroEstimado,
  medias,
  metaDoDia,
  planejarMes,
} from '../src/meta';
import { progressoMeta } from '../src/period';
import { formatHoras, formatMoney } from '../src/format';

const TODOS = [0, 1, 2, 3, 4, 5, 6];
const SEX_SAB_DOM = [5, 6, 0];

describe('exemplo do motorista (out/2026)', () => {
  const dia = { faturamento: 94.95, horas: 141 / 60, km: 28.82, diasTrabalhados: 1 };

  it('cards de desempenho', () => {
    const m = medias(dia);
    expect(m.porHora).toBe(40.4);
    expect(formatMoney(m.porKm)).toBe('R$ 3,29');
    expect(formatHoras(dia.horas)).toBe('2h21');
  });

  it('barra da meta mensal', () => {
    const p = progressoMeta(94.95, 2700);
    expect(p.percentual).toBe(3.52);
    expect(p.restante).toBe(2605.05);
  });

  it('meta de hoje: R$ 300 com R$ 94,95 faturado → faltam 205,05 em ~5h04', () => {
    const d = metaDoDia({ meta: 300, faturado: 94.95, horas: 141 / 60, km: 28.82 });
    expect(d.restante).toBe(205.05);
    expect(d.percentual).toBe(31.65);
    expect(formatHoras(d.horasRestantes)).toBe('5h05');
  });
});

describe('datasPlanejadas', () => {
  it('sexta, sábado e domingo do resto de outubro', () => {
    const d = datasPlanejadas('2026-10-03', '2026-10-31', SEX_SAB_DOM);
    expect(d[0]).toBe('2026-10-03'); // sábado
    expect(d[1]).toBe('2026-10-04'); // domingo
    expect(d[2]).toBe('2026-10-09'); // sexta
    expect(d).toHaveLength(13);
  });
});

describe('planejarMes', () => {
  const base = {
    alvo: 2700,
    hoje: '2026-10-02', // sexta
    diasDeTrabalho: SEX_SAB_DOM,
    faturadoAntesDeHoje: 0,
    faturadoHoje: 94.95,
    hojeEncerrado: false,
    desempenho: { faturamento: 94.95, horas: 2.35, km: 28.82, diasTrabalhados: 1 },
  };

  it('distribui o mês entre hoje e os próximos dias planejados', () => {
    const p = planejarMes(base);
    // hoje + 13 dias (sex/sáb/dom de 03 a 31) → 2700 ÷ 14
    expect(p.metaHoje).toBe(192.86);
    expect(p.proximosDias).toHaveLength(13);
    // enquanto o dia está aberto, assume que hoje fecha na meta
    expect(p.metaPorProximoDia).toBe(192.86);
    expect(p.progresso.restante).toBe(2605.05);
    expect(p.horasNecessarias).toBeCloseTo(64.48, 1);
  });

  it('excedente de hoje reduz os próximos dias; déficit aumenta', () => {
    const acima = planejarMes({ ...base, faturadoHoje: 350, hojeEncerrado: true });
    const abaixo = planejarMes({ ...base, faturadoHoje: 100, hojeEncerrado: true });
    expect(acima.saldoHoje).toBeCloseTo(350 - 192.86, 2);
    expect(acima.metaPorProximoDia!).toBeLessThan(192.86);
    expect(abaixo.metaPorProximoDia!).toBeGreaterThan(192.86);
    expect(abaixo.metaPorProximoDia).toBe(200); // (2700 − 100) / 13
  });

  it('meta manual de hoje vence a automática', () => {
    const p = planejarMes({ ...base, metaManualHoje: 300 });
    expect(p.metaHoje).toBe(300);
    expect(p.metaHojeManual).toBe(true);
  });

  it('dia de folga sem faturamento não tem meta', () => {
    const p = planejarMes({ ...base, hoje: '2026-10-06', faturadoHoje: 0, diasDeTrabalho: SEX_SAB_DOM });
    expect(p.metaHoje).toBeNull();
  });

  it('ideal deixa folga de um dia; com 1 dia restante é igual à mínima', () => {
    const p = planejarMes({ ...base, hoje: '2026-10-30', diasDeTrabalho: TODOS, hojeEncerrado: true });
    expect(p.proximosDias).toHaveLength(1);
    expect(p.proximosDias[0]!.ideal).toBe(p.proximosDias[0]!.minima);
  });

  it('cenários ±15% e projeção a partir da média por dia', () => {
    const p = planejarMes(base);
    const [cons, atual, exc] = p.cenarios;
    expect(atual!.porHora).toBe(40.4);
    expect(cons!.porHora).toBe(34.34);
    expect(exc!.porHora).toBe(46.46);
    // 94,95 + 94,95 × 13 dias futuros
    expect(atual!.faturamentoProjetado).toBe(1329.3);
  });

  it('sem histórico não inventa projeção', () => {
    const p = planejarMes({
      ...base,
      faturadoHoje: 0,
      desempenho: { faturamento: 0, horas: 0, km: 0, diasTrabalhados: 0 },
    });
    expect(p.medias.porHora).toBeNull();
    expect(p.horasNecessarias).toBeNull();
    expect(p.cenarios.every((c) => c.faturamentoProjetado === null)).toBe(true);
    expect(p.proximosDias[0]!.horasEstimadas).toBeNull();
  });

  it('meta já batida: nada falta', () => {
    const p = planejarMes({ ...base, faturadoAntesDeHoje: 2800, faturadoHoje: 0, hojeEncerrado: true });
    expect(p.progresso.atingida).toBe(true);
    expect(p.metaPorProximoDia).toBe(0);
  });
});

describe('metaDoDia', () => {
  it('meta batida mostra excedente', () => {
    const d = metaDoDia({ meta: 300, faturado: 312.5, horas: 7, km: 100 });
    expect(d.atingida).toBe(true);
    expect(d.excedente).toBe(12.5);
    expect(d.percentual).toBe(104.17);
    expect(d.horasRestantes).toBe(0);
  });

  it('sem horas não estima tempo', () => {
    expect(metaDoDia({ meta: 300, faturado: 0, horas: 0, km: 0 }).horasRestantes).toBeNull();
  });
});

describe('lucroEstimado', () => {
  it('faturamento e lucro não são a mesma coisa', () => {
    const l = lucroEstimado({
      faturamento: 94.95,
      km: 28.82,
      horas: 2.35,
      combustivel: 12.1,
      despesas: 5,
      custosPorKm: { manutencao: 0.1, pneus: 0.05, revisao: 0.05, outros: 0 },
    });
    expect(l.outrosCustos).toBe(10.76); // 0,20 × 28,82 + 5
    expect(l.custoTotal).toBe(22.86);
    expect(l.lucro).toBe(72.09);
    expect(l.lucro).toBeLessThan(l.receitaBruta);
  });
});

describe('farol e avaliação', () => {
  const lim = { vermelhoAbaixo: 30, verdeAcima: 40 };
  it('limites do exemplo', () => {
    expect(farol(29.99, lim)).toBe('vermelho');
    expect(farol(30, lim)).toBe('amarelo');
    expect(farol(40, lim)).toBe('amarelo');
    expect(farol(40.4, lim)).toBe('verde');
    expect(farol(null, lim)).toBeNull();
  });

  it('o pior indicador decide o dia', () => {
    const a = avaliarDia({
      porHora: 40.4,
      porKm: 1.9,
      lucroPorHora: 35,
      limites: { porHora: lim, porKm: { vermelhoAbaixo: 2, verdeAcima: 2.8 }, lucroPorHora: { vermelhoAbaixo: 20, verdeAcima: 30 } },
    });
    expect(a.geral).toBe('vermelho');
  });

  it('alertas', () => {
    const f = (v: number) => formatMoney(v);
    expect(alertasDoDia({ dia: metaDoDia({ meta: 300, faturado: 318, horas: 7, km: 100 }), porHoraFarol: 'verde', porKmFarol: 'verde', formatar: f })[0]!.texto).toBe(
      'Meta batida! Você fez R$ 18,00 acima do planejado.',
    );
    expect(alertasDoDia({ dia: metaDoDia({ meta: 300, faturado: 200, horas: 5, km: 60 }), porHoraFarol: 'vermelho', porKmFarol: null, formatar: f }).map((a) => a.texto)).toEqual([
      'Faltam R$ 100,00 para encerrar a meta de hoje.',
      'Seu R$/hora está abaixo do limite configurado.',
    ]);
  });
});
