/**
 * Cards que o dashboard sabe desenhar (seção 14).
 *
 * Fica fora do arquivo de Server Actions de propósito: um módulo 'use server'
 * só pode exportar funções assíncronas.
 */
export const CARDS_DISPONIVEIS = [
  ['fat_hoje', 'Faturamento de hoje'],
  ['disponivel', 'Valor disponível'],
  ['km', 'KM rodados'],
  ['rs_km', 'R$ por km'],
  ['rs_hora', 'R$ por hora'],
  ['custo_km', 'Custo total por km'],
  ['combustivel', 'Combustível'],
  ['reserva_veic', 'Reservado hoje para o carro'],
  ['reserva_emerg', 'Reservado hoje para emergência'],
] as const;

export const CHAVES_CARDS: readonly string[] = CARDS_DISPONIVEIS.map(([k]) => k);
