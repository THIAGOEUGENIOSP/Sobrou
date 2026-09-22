import { describe, expect, it } from 'vitest';
import {
  diasNoIntervalo,
  mesAtual,
  resolverPeriodo,
  semanaAtual,
  somarDias,
} from '../src/periodo';

describe('aritmética de datas', () => {
  it('soma e subtrai dias atravessando o mês', () => {
    expect(somarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(somarDias('2024-03-01', -1)).toBe('2024-02-29'); // ano bissexto
  });

  it('conta as duas pontas do intervalo', () => {
    expect(diasNoIntervalo('2026-09-01', '2026-09-01')).toBe(1);
    expect(diasNoIntervalo('2026-09-01', '2026-09-30')).toBe(30);
  });
});

describe('recortes de período (seção 19)', () => {
  const hoje = '2026-09-21';

  it('hoje e ontem são um dia só', () => {
    expect(resolverPeriodo('hoje', hoje)).toMatchObject({ de: hoje, ate: hoje, dias: 1 });
    expect(resolverPeriodo('ontem', hoje)).toMatchObject({
      de: '2026-09-20',
      ate: '2026-09-20',
      dias: 1,
    });
  });

  it('7 e 30 dias incluem hoje', () => {
    expect(resolverPeriodo('sete_dias', hoje)).toMatchObject({ de: '2026-09-15', ate: hoje, dias: 7 });
    expect(resolverPeriodo('trinta_dias', hoje)).toMatchObject({
      de: '2026-08-23',
      ate: hoje,
      dias: 30,
    });
  });

  it('"este mês" vai do dia 1 até hoje, não até o fim do mês', () => {
    const p = resolverPeriodo('mes', hoje);
    expect(p.de).toBe('2026-09-01');
    expect(p.ate).toBe(hoje);
    expect(p.rotulo).toBe('setembro de 2026');
  });

  it('"mês passado" pega o mês inteiro', () => {
    const p = resolverPeriodo('mes_anterior', hoje);
    expect(p).toMatchObject({ de: '2026-08-01', ate: '2026-08-31', dias: 31 });
  });

  it('acerta fevereiro em ano bissexto', () => {
    const p = resolverPeriodo('mes_anterior', '2024-03-10');
    expect(p).toMatchObject({ de: '2024-02-01', ate: '2024-02-29', dias: 29 });
  });

  it('o ano começa em 1º de janeiro', () => {
    expect(resolverPeriodo('ano', hoje)).toMatchObject({ de: '2026-01-01', ate: hoje });
  });
});

describe('janela de comparação', () => {
  it('mês compara com o mês-calendário anterior, não com 30 dias atrás', () => {
    // Comparar "este mês" com "os 30 dias anteriores" mostraria uma queda
    // enorme todo dia 1º, que não significa nada.
    const p = resolverPeriodo('mes', '2026-09-03');
    expect(p.anterior).toMatchObject({ de: '2026-08-01', ate: '2026-08-31' });
    expect(p.anterior.rotulo).toBe('agosto de 2026');
  });

  it('janeiro compara com dezembro do ano anterior', () => {
    const p = resolverPeriodo('mes', '2026-01-15');
    expect(p.anterior).toMatchObject({ de: '2025-12-01', ate: '2025-12-31' });
  });

  it('períodos móveis comparam com janela do mesmo tamanho, colada antes', () => {
    const p = resolverPeriodo('sete_dias', '2026-09-21');
    expect(p).toMatchObject({ de: '2026-09-15', ate: '2026-09-21' });
    expect(p.anterior).toMatchObject({ de: '2026-09-08', ate: '2026-09-14', dias: 7 });
  });

  it('as duas janelas nunca se sobrepõem', () => {
    for (const chave of ['hoje', 'ontem', 'sete_dias', 'trinta_dias', 'ano'] as const) {
      const p = resolverPeriodo(chave, '2026-09-21');
      expect(p.anterior.ate < p.de, `${chave} sobrepôs`).toBe(true);
    }
  });

  it('mês passado compara com o retrasado', () => {
    const p = resolverPeriodo('mes_anterior', '2026-09-21');
    expect(p).toMatchObject({ de: '2026-08-01', ate: '2026-08-31' });
    expect(p.anterior).toMatchObject({ de: '2026-07-01', ate: '2026-07-31' });
  });
});

describe('janelas de meta', () => {
  // 2026-09-21 é uma segunda-feira.
  it('a semana começa na segunda', () => {
    expect(semanaAtual('2026-09-21')).toEqual({
      de: '2026-09-21',
      ate: '2026-09-21',
      diasRestantes: 6,
    });
    expect(semanaAtual('2026-09-24')).toMatchObject({ de: '2026-09-21', ate: '2026-09-24' });
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    // Sem esse cuidado, o domingo zeraria a meta semanal um dia cedo demais.
    expect(semanaAtual('2026-09-27')).toEqual({
      de: '2026-09-21',
      ate: '2026-09-27',
      diasRestantes: 0,
    });
  });

  it('a semana atravessa a virada do mês', () => {
    expect(semanaAtual('2026-10-01')).toMatchObject({ de: '2026-09-28', ate: '2026-10-01' });
  });

  it('o mês vai do dia 1 até hoje e sabe quantos dias faltam', () => {
    expect(mesAtual('2026-09-21')).toEqual({
      de: '2026-09-01',
      ate: '2026-09-21',
      diasRestantes: 9,
    });
    expect(mesAtual('2026-02-10').diasRestantes).toBe(18);
    expect(mesAtual('2024-02-10').diasRestantes).toBe(19); // bissexto
  });

  it('no último dia do mês não faltam dias', () => {
    expect(mesAtual('2026-09-30').diasRestantes).toBe(0);
  });
});

describe('período personalizado', () => {
  it('usa as datas informadas', () => {
    const p = resolverPeriodo('personalizado', '2026-09-21', {
      de: '2026-09-01',
      ate: '2026-09-10',
    });
    expect(p).toMatchObject({ de: '2026-09-01', ate: '2026-09-10', dias: 10 });
  });

  it('corrige datas invertidas em vez de devolver período vazio', () => {
    const p = resolverPeriodo('personalizado', '2026-09-21', {
      de: '2026-09-10',
      ate: '2026-09-01',
    });
    expect(p).toMatchObject({ de: '2026-09-01', ate: '2026-09-10' });
  });

  it('sem datas, cai nos últimos 30 dias', () => {
    const p = resolverPeriodo('personalizado', '2026-09-21', {});
    expect(p).toMatchObject({ de: '2026-08-23', ate: '2026-09-21' });
  });
});
