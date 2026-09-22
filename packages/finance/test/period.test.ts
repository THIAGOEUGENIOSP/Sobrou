import { describe, expect, it } from 'vitest';
import {
  agregarPeriodo,
  compararIndicador,
  compararPeriodos,
  progressoMeta,
  ritmoNecessario,
  variacaoPercentual,
  type ShiftSnapshot,
} from '../src/period';

function turno(over: Partial<ShiftSnapshot> = {}): ShiftSnapshot {
  return {
    workDate: '2026-10-01',
    km: 200,
    horas: 8,
    litros: 20,
    faturamento: 300,
    custoCombustivel: 78,
    outrasDespesas: 22,
    resultadoOperacional: 200,
    reservaVeiculo: 40,
    reservaEmergencia: 20,
    disponivel: 140,
    qtdCorridas: 18,
    ...over,
  };
}

describe('fechamento mensal (seção 13)', () => {
  const turnos: ShiftSnapshot[] = [
    turno({ workDate: '2026-10-01' }),
    turno({ workDate: '2026-10-02' }),
    // dois turnos no mesmo dia contam como um dia trabalhado
    turno({ workDate: '2026-10-02', km: 100, horas: 4, faturamento: 150, resultadoOperacional: 100, disponivel: 70, reservaVeiculo: 20, reservaEmergencia: 10, qtdCorridas: 9, litros: 10, custoCombustivel: 39, outrasDespesas: 11 }),
  ];

  const totais = agregarPeriodo(turnos, {
    abastecimentos: [
      { litros: 30, custo: 117 },
      { litros: 20, custo: 78 },
    ],
    manutencoes: [350],
  });

  it('conta dias trabalhados, não turnos', () => {
    expect(totais.diasTrabalhados).toBe(2);
    expect(totais.turnos).toBe(3);
  });

  it('soma km, horas, faturamento e corridas', () => {
    expect(totais.km).toBe(500);
    expect(totais.horas).toBe(20);
    expect(totais.faturamento).toBe(750);
    expect(totais.qtdCorridas).toBe(45);
  });

  it('calcula os indicadores do período', () => {
    expect(totais.faturamentoPorKm).toBe(1.5);
    expect(totais.faturamentoPorHora).toBe(37.5);
    expect(totais.custoCombustivelPorKm).toBe(0.39);
  });

  it('usa os litros realmente abastecidos para o consumo e o preço médio', () => {
    expect(totais.litrosAbastecidos).toBe(50);
    expect(totais.gastoCombustivelReal).toBe(195);
    expect(totais.precoMedioLitro).toBe(3.9);
    expect(totais.consumoMedio).toBe(10);
  });

  it('separa reserva de manutenção e manutenção realizada', () => {
    expect(totais.reservaVeiculo).toBe(100);
    expect(totais.manutencaoRealizada).toBe(350);
  });

  it('desconta despesas avulsas do resultado e do disponível', () => {
    const comAvulsa = agregarPeriodo(turnos, { despesasAvulsas: [100] });
    expect(comAvulsa.outrasDespesas).toBe(155);
    expect(comAvulsa.resultadoOperacional).toBe(400);
    expect(comAvulsa.disponivel).toBe(250);
  });

  it('soma receita avulsa ao resultado e ao disponível', () => {
    const comReceita = agregarPeriodo(turnos, { receitasAvulsas: [80] });
    expect(comReceita.outrasReceitas).toBe(80);
    expect(comReceita.entradaTotal).toBe(830);
    expect(comReceita.resultadoOperacional).toBe(580);
    expect(comReceita.disponivel).toBe(430);
  });

  it('receita avulsa NÃO entra no R$/km nem no R$/hora', () => {
    // Uma gorjeta recebida em casa não foi ganha rodando. Somá-la ao
    // faturamento inflaria justamente o indicador usado para decidir se
    // compensa trabalhar.
    const semReceita = agregarPeriodo(turnos);
    const comReceita = agregarPeriodo(turnos, { receitasAvulsas: [500] });

    expect(comReceita.faturamento).toBe(semReceita.faturamento);
    expect(comReceita.faturamentoPorKm).toBe(semReceita.faturamentoPorKm);
    expect(comReceita.faturamentoPorHora).toBe(semReceita.faturamentoPorHora);
    expect(comReceita.entradaTotal).toBeGreaterThan(semReceita.entradaTotal);
  });

  it('período vazio não quebra', () => {
    const vazio = agregarPeriodo([]);
    expect(vazio.diasTrabalhados).toBe(0);
    expect(vazio.faturamentoPorKm).toBeNull();
    expect(vazio.qtdCorridas).toBeNull();
  });
});

describe('o mesmo dia mostra o mesmo número em qualquer tela', () => {
  // Dashboard, relatório e exportação chamam todos `agregarPeriodo`. Este
  // teste trava a invariante: agregar um único turno devolve exatamente o
  // snapshot daquele turno, sem arredondar de novo nem somar duas vezes.
  const t = turno({
    km: 212.5,
    horas: 8.5,
    faturamento: 445.15,
    custoCombustivel: 86.37,
    outrasDespesas: 37.3,
    resultadoOperacional: 321.48,
    reservaVeiculo: 64.3,
    reservaEmergencia: 32.15,
    disponivel: 225.03,
  });

  it('um turno agregado é igual ao próprio snapshot', () => {
    const total = agregarPeriodo([t]);
    expect(total.km).toBe(t.km);
    expect(total.horas).toBe(t.horas);
    expect(total.faturamento).toBe(t.faturamento);
    expect(total.custoCombustivel).toBe(t.custoCombustivel);
    expect(total.outrasDespesas).toBe(t.outrasDespesas);
    expect(total.resultadoOperacional).toBe(t.resultadoOperacional);
    expect(total.reservaVeiculo).toBe(t.reservaVeiculo);
    expect(total.reservaEmergencia).toBe(t.reservaEmergencia);
    expect(total.disponivel).toBe(t.disponivel);
  });

  it('a linha TOTAL da exportação fecha com a soma das linhas', () => {
    const turnos = [t, turno({ workDate: '2026-10-02' }), turno({ workDate: '2026-10-03' })];
    const total = agregarPeriodo(turnos);

    const somaManual = (f: (x: ShiftSnapshot) => number) =>
      Math.round(turnos.reduce((a, x) => a + f(x), 0) * 100) / 100;

    expect(total.faturamento).toBe(somaManual((x) => x.faturamento));
    expect(total.disponivel).toBe(somaManual((x) => x.disponivel));
    expect(total.reservaVeiculo).toBe(somaManual((x) => x.reservaVeiculo));
    expect(total.resultadoOperacional).toBe(somaManual((x) => x.resultadoOperacional));
  });
});

describe('comparação entre meses (seção 13)', () => {
  it('reproduz o exemplo: 4.500 para 5.200 é +15,56%', () => {
    expect(variacaoPercentual(5200, 4500)).toBe(15.56);
  });

  it('calcula queda com sinal negativo', () => {
    expect(variacaoPercentual(4500, 5200)).toBe(-13.46);
  });

  it('não inventa variação sobre período zerado', () => {
    expect(variacaoPercentual(5200, 0)).toBeNull();
  });

  it('classifica a direção', () => {
    expect(compararIndicador(5200, 4500).direcao).toBe('alta');
    expect(compararIndicador(4500, 5200).direcao).toBe('baixa');
    expect(compararIndicador(4500, 4500).direcao).toBe('estavel');
    expect(compararIndicador(4500, 0).direcao).toBe('indefinida');
  });

  it('compara todos os indicadores de dois períodos', () => {
    const setembro = agregarPeriodo([turno({ faturamento: 4500, km: 3000 })]);
    const outubro = agregarPeriodo([turno({ faturamento: 5200, km: 3200 })]);
    const c = compararPeriodos(outubro, setembro);

    expect(c.faturamento?.variacao).toBe(15.56);
    expect(c.km?.variacao).toBe(6.67);
  });
});

describe('metas (seção 15)', () => {
  it('reproduz o exemplo: 2.850 de 4.000 é 71,25%', () => {
    const p = progressoMeta(2850, 4000);
    expect(p.percentual).toBe(71.25);
    expect(p.restante).toBe(1150);
    expect(p.atingida).toBe(false);
  });

  it('marca meta atingida e não mostra restante negativo', () => {
    const p = progressoMeta(4200, 4000);
    expect(p.percentual).toBe(105);
    expect(p.restante).toBe(0);
    expect(p.atingida).toBe(true);
  });

  it('meta zerada não gera divisão por zero', () => {
    expect(progressoMeta(100, 0).percentual).toBeNull();
  });

  it('calcula o ritmo diário necessário para fechar a meta', () => {
    expect(ritmoNecessario(2850, 4000, 10)).toBe(115);
  });

  it('não exige ritmo quando a meta já foi batida ou o mês acabou', () => {
    expect(ritmoNecessario(4200, 4000, 5)).toBeNull();
    expect(ritmoNecessario(2850, 4000, 0)).toBeNull();
  });
});
