import { resolverPeriodo as resolver, type ChavePeriodo, type Periodo } from '@sobrou/finance';
import { dataLocal } from '@/lib/numeros';

/**
 * Ponte entre o fuso do usuário e a aritmética de períodos.
 *
 * Toda a lógica de recorte e de janela de comparação vive em
 * `@sobrou/finance`, testada isoladamente. Aqui fica só a única coisa que
 * depende do ambiente: qual é "hoje" para este motorista.
 */
export function resolverPeriodoDoUsuario(
  chave: ChavePeriodo,
  timezone: string,
  personalizado?: { de?: string | undefined; ate?: string | undefined },
): Periodo {
  return resolver(chave, dataLocal(new Date(), timezone), personalizado);
}

export type { ChavePeriodo, Periodo };
export { PERIODOS } from '@sobrou/finance';
