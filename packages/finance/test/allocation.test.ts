import { describe, expect, it } from 'vitest';
import { ALLOCATION_PADRAO, distribuir, validarPercentuais } from '../src/allocation';
import { money } from '../src/money';

describe('validação dos percentuais (seção 7)', () => {
  it('aceita a soma exata de 100', () => {
    expect(validarPercentuais({ pctDisponivel: 70, pctEmergencia: 10, pctVeiculo: 20 }).valido).toBe(true);
    expect(validarPercentuais({ pctDisponivel: 50, pctEmergencia: 20, pctVeiculo: 30 }).valido).toBe(true);
    expect(validarPercentuais({ pctDisponivel: 33.34, pctEmergencia: 33.33, pctVeiculo: 33.33 }).valido).toBe(true);
  });

  it('recusa soma diferente de 100', () => {
    const r = validarPercentuais({ pctDisponivel: 70, pctEmergencia: 10, pctVeiculo: 30 });
    expect(r.valido).toBe(false);
    expect(r.soma).toBe(110);
    expect(r.erros[0]).toContain('110');
  });

  it('recusa percentual negativo', () => {
    expect(validarPercentuais({ pctDisponivel: 110, pctEmergencia: -10, pctVeiculo: 0 }).valido).toBe(false);
  });

  it('o padrão 70/10/20 é apenas sugestão, e é válido', () => {
    expect(ALLOCATION_PADRAO).toEqual({ pctDisponivel: 70, pctEmergencia: 10, pctVeiculo: 20 });
    expect(validarPercentuais(ALLOCATION_PADRAO).valido).toBe(true);
  });
});

describe('distribuição do resultado', () => {
  it('distribui 70/10/20 sobre o resultado do exemplo', () => {
    const d = distribuir(292.94, ALLOCATION_PADRAO);
    expect(d.reservaVeiculo).toBe(58.59);
    expect(d.reservaEmergencia).toBe(29.29);
    expect(d.disponivel).toBe(205.06);
    expect(d.prejuizo).toBe(false);
  });

  it('respeita percentuais personalizados', () => {
    const d = distribuir(1000, { pctDisponivel: 50, pctEmergencia: 20, pctVeiculo: 30 });
    expect(d.reservaVeiculo).toBe(300);
    expect(d.reservaEmergencia).toBe(200);
    expect(d.disponivel).toBe(500);
  });

  it('as três partes sempre somam a base, sem sobrar centavo', () => {
    const configs = [
      { pctDisponivel: 70, pctEmergencia: 10, pctVeiculo: 20 },
      { pctDisponivel: 33.34, pctEmergencia: 33.33, pctVeiculo: 33.33 },
      { pctDisponivel: 45.5, pctEmergencia: 12.25, pctVeiculo: 42.25 },
      { pctDisponivel: 100, pctEmergencia: 0, pctVeiculo: 0 },
    ];

    for (const config of configs) {
      for (let centavos = 1; centavos <= 2000; centavos += 7) {
        const base = centavos / 100;
        const d = distribuir(base, config);
        const soma = money(d.reservaVeiculo + d.reservaEmergencia + d.disponivel);
        expect(soma, `base ${base} com ${JSON.stringify(config)}`).toBe(money(base));
      }
    }
  });

  it('dia de prejuízo não gera reserva nenhuma', () => {
    const d = distribuir(-45.3, ALLOCATION_PADRAO);
    expect(d.prejuizo).toBe(true);
    expect(d.reservaVeiculo).toBe(0);
    expect(d.reservaEmergencia).toBe(0);
    // O prejuízo aparece inteiro, em vermelho, e não é escondido.
    expect(d.disponivel).toBe(-45.3);
  });

  it('resultado zero distribui zero', () => {
    const d = distribuir(0, ALLOCATION_PADRAO);
    expect(d.reservaVeiculo).toBe(0);
    expect(d.disponivel).toBe(0);
    expect(d.prejuizo).toBe(false);
  });

  it('recusa distribuir com percentuais inválidos', () => {
    expect(() => distribuir(100, { pctDisponivel: 70, pctEmergencia: 10, pctVeiculo: 30 })).toThrow(
      /100%/,
    );
  });
});
