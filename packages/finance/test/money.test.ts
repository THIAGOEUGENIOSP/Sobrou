import { describe, expect, it } from 'vitest';
import {
  applyPercent,
  hoursBetween,
  minutesToHours,
  money,
  percentOf,
  roundTo,
  safeDiv,
  sumMoney,
} from '../src/money';

describe('arredondamento monetário', () => {
  it('arredonda metade para longe do zero', () => {
    expect(money(1.005)).toBe(1.01);
    expect(money(2.675)).toBe(2.68);
    expect(money(-1.005)).toBe(-1.01);
    expect(money(-2.675)).toBe(-2.68);
  });

  it('não é enganado pela representação binária', () => {
    // 1.005 * 100 = 100.49999999999999 em ponto flutuante
    expect(money(0.615)).toBe(0.62);
    expect(money(1.255)).toBe(1.26);
    expect(money(8.575)).toBe(8.58);
  });

  it('preserva valores já redondos', () => {
    expect(money(100)).toBe(100);
    expect(money(0)).toBe(0);
    expect(money(-0)).toBe(0);
  });

  it('aceita outras precisões', () => {
    expect(roundTo(3.90176, 4)).toBe(3.9018);
    expect(roundTo(9.7561, 2)).toBe(9.76);
  });
});

describe('divisão segura', () => {
  it('devolve null em vez de dividir por zero', () => {
    expect(safeDiv(100, 0)).toBeNull();
    expect(safeDiv(0, 0)).toBeNull();
  });

  it('devolve null para entradas inválidas', () => {
    expect(safeDiv(Number.NaN, 10)).toBeNull();
    expect(safeDiv(10, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('divide normalmente quando dá', () => {
    expect(safeDiv(42, 9.6, 4)).toBe(4.375);
    expect(safeDiv(330, 42, 2)).toBe(7.86);
  });
});

describe('auxiliares', () => {
  it('soma em reais arredondando só no fim', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([250, 80])).toBe(330);
    expect(sumMoney([])).toBe(0);
  });

  it('calcula percentual de um total', () => {
    expect(percentOf(2850, 4000)).toBe(71.25);
    expect(percentOf(10, 0)).toBeNull();
  });

  it('aplica percentual sobre um valor', () => {
    expect(applyPercent(292.93, 20)).toBe(58.59);
    expect(applyPercent(292.93, 10)).toBe(29.29);
  });

  it('converte tempo', () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(hoursBetween('2026-09-21T08:00:00Z', '2026-09-21T12:30:00Z')).toBe(4.5);
  });

  it('recusa intervalo invertido', () => {
    expect(hoursBetween('2026-09-21T12:00:00Z', '2026-09-21T08:00:00Z')).toBeNull();
  });
});
