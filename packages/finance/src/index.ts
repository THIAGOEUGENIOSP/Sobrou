/**
 * @kmlegal/finance — todas as fórmulas financeiras do KM Legal.
 *
 * Regra do projeto: nenhuma tela, rota ou relatório calcula indicador por
 * conta própria. Tudo passa por aqui. É o que impede o dashboard e o
 * relatório mensal de mostrarem números diferentes para o mesmo dia.
 *
 * O pacote é TypeScript puro, sem dependência de React, Next ou Supabase,
 * justamente para poder ser testado sozinho e reaproveitado num app nativo.
 */

export * from './types';
export * from './money';
export * from './fuel';
export * from './shift';
export * from './allocation';
export * from './reserves';
export * from './vehicle-cost';
export * from './ride';
export * from './period';
export * from './periodo';
export * from './closing';
export * from './format';
