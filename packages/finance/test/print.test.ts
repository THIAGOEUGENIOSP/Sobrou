import { describe, expect, it } from 'vitest';
import { lerTextoDoPrint } from '../src/print';

describe('lerTextoDoPrint', () => {
  it('resumo típico de ganhos do dia', () => {
    const texto = `qui., 2 de out.
Ganhos
R$ 94,95
Online 2 h 21 min
6 viagens
Distância 28,8 km`;
    const r = lerTextoDoPrint(texto, 2026);
    expect(r.valor).toBe(94.95);
    expect(r.minutosOnline).toBe(141);
    expect(r.viagens).toBe(6);
    expect(r.data).toBe('2026-10-02');
    expect(r.km).toBe(28.8);
  });

  it('OCR que lê "R$" como "RS" e tempo em linha separada', () => {
    const r = lerTextoDoPrint('Total\nRS 1.234,50\nTempo online\n5h 07min\nViagens: 14', 2026);
    expect(r.valor).toBe(1234.5);
    expect(r.minutosOnline).toBe(307);
    expect(r.viagens).toBe(14);
  });

  it('vários valores sem âncora: não escolhe, devolve candidatos', () => {
    const r = lerTextoDoPrint('Tarifa R$ 80,00\nPromoção R$ 10,00\nGorjeta R$ 4,95', 2026);
    expect(r.valor).toBeNull();
    expect(r.valoresCandidatos).toEqual([80, 10, 4.95]);
  });

  it('nada reconhecível', () => {
    const r = lerTextoDoPrint('foto borrada', 2026);
    expect(r).toEqual({ valor: null, valoresCandidatos: [], minutosOnline: null, viagens: null, data: null, km: null });
  });

  it('data no formato dd/mm/aaaa', () => {
    expect(lerTextoDoPrint('02/10/2026 Ganhos R$ 50,00', 2026).data).toBe('2026-10-02');
  });
});
