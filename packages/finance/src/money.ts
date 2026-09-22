/**
 * Aritmética monetária e divisões seguras.
 *
 * Duas regras valem em todo o pacote:
 *
 * 1. Dinheiro é arredondado para 2 casas com "metade para longe do zero"
 *    (0,005 vira 0,01 e -0,005 vira -0,01), que é a convenção usada no Brasil.
 *    `Math.round` sozinho não serve: ele arredonda -0,5 para -0 e erra casos
 *    como 1,005 por causa da representação binária.
 *
 * 2. Nenhuma divisão por zero chega à tela. Quando o denominador é zero ou
 *    inválido, o resultado é `null` e a interface mostra "—". Retornar 0 seria
 *    pior: um dia sem km rodado apareceria como "R$ 0,00/km", o que é falso.
 */

/** Arredonda com "metade para longe do zero", corrigindo erro de ponto flutuante. */
export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return Number.NaN;
  const factor = 10 ** decimals;
  // toPrecision(15) descarta o lixo binário de 1.005 * 100 = 100.49999999999999
  const scaled = Number((value * factor).toPrecision(15));
  const sign = scaled < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(scaled))) / factor;
}

/** Arredonda valores em reais (2 casas). */
export function money(value: number): number {
  return roundTo(value, 2);
}

/** Arredonda preços por litro e por km (4 casas), onde o centavo não basta. */
export function rate(value: number): number {
  return roundTo(value, 4);
}

/**
 * Divisão que devolve `null` em vez de Infinity/NaN.
 * `decimals` arredonda o resultado; passe `null` para não arredondar.
 */
export function safeDiv(
  numerator: number,
  denominator: number,
  decimals: number | null = 4,
): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  if (!Number.isFinite(result)) return null;
  return decimals === null ? result : roundTo(result, decimals);
}

/** Soma uma lista de valores monetários, arredondando só no fim. */
export function sumMoney(values: readonly number[]): number {
  return money(values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0));
}

/** Percentual de `part` sobre `total`; `null` quando o total é zero. */
export function percentOf(part: number, total: number, decimals = 2): number | null {
  return safeDiv(part * 100, total, decimals);
}

/** Aplica um percentual (0 a 100) sobre um valor, já arredondado em reais. */
export function applyPercent(value: number, percent: number): number {
  return money((value * percent) / 100);
}

/** Converte minutos em horas decimais. */
export function minutesToHours(minutes: number): number {
  return roundTo(minutes / 60, 4);
}

/**
 * Horas decimais entre dois instantes, sem arredondar. `null` se o intervalo
 * for inválido.
 *
 * Use esta versão como DENOMINADOR. Dividir por um valor já arredondado
 * propaga o erro: 20 min arredondados para 0,3333 h fazem R$ 22 virarem
 * R$ 66,01/h em vez de R$ 66,00/h.
 */
export function hoursBetweenExact(start: Date | string, end: Date | string): number | null {
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3_600_000;
}

/** Horas decimais arredondadas para exibição e para o snapshot. */
export function hoursBetween(start: Date | string, end: Date | string): number | null {
  const exact = hoursBetweenExact(start, end);
  return exact === null ? null : roundTo(exact, 4);
}
