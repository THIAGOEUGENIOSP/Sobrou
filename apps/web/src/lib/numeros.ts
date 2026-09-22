import { z } from 'zod';

/**
 * Leitura de números digitados no celular brasileiro.
 *
 * O teclado numérico do Android manda vírgula, o do iPhone às vezes manda
 * ponto, e quem digita valor alto costuma pôr separador de milhar. Aceitar só
 * um formato faria o motorista brigar com o formulário na fila do posto.
 */

/** "1.234,56" e "1234.56" viram 1234.56. Devolve NaN quando não dá. */
export function lerNumeroBR(valor: string): number {
  const limpo = valor.trim().replace(/\s/g, '');
  if (limpo === '') return Number.NaN;

  const temVirgula = limpo.includes(',');
  const normalizado = temVirgula
    ? limpo.replace(/\./g, '').replace(',', '.') // vírgula é decimal, ponto é milhar
    : limpo.replace(/\.(?=\d{3}\b)/g, ''); // só ponto: milhar se sobram 3 dígitos

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Campo numérico obrigatório e positivo. */
export function numeroObrigatorio(mensagem: string, opcoes: { min?: number } = {}) {
  const min = opcoes.min ?? 0;
  return z
    .string()
    .transform(lerNumeroBR)
    .refine((n) => Number.isFinite(n) && n > min, mensagem);
}

/** Campo numérico opcional: vazio vira null, e não 0. */
export function numeroOpcional(mensagem: string, opcoes: { min?: number } = {}) {
  const min = opcoes.min ?? 0;
  return z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v.trim() === '') return null;
      return lerNumeroBR(v);
    })
    .refine((n) => n === null || (Number.isFinite(n) && n >= min), mensagem);
}

/** Campo numérico que aceita zero (desconto, cashback). */
export function numeroComZero(mensagem: string) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === '' ? 0 : lerNumeroBR(v)))
    .refine((n) => Number.isFinite(n) && n >= 0, mensagem);
}

/** Junta data e hora do formulário num instante no fuso do usuário. */
export function montarInstante(data: string, hora: string, timezone: string): Date {
  // `data` e `hora` vêm de <input type="date"> e <input type="time">, sempre
  // no formato ISO. O deslocamento do fuso é calculado para a data informada,
  // e não para hoje, porque o horário de verão pode mudar no meio do período.
  const ingenuo = new Date(`${data}T${hora}:00Z`);
  const offset = deslocamentoMinutos(ingenuo, timezone);
  return new Date(ingenuo.getTime() + offset * 60_000);
}

/** Minutos que se somam ao horário local para chegar ao UTC. */
function deslocamentoMinutos(instante: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const partes = Object.fromEntries(
    fmt.formatToParts(instante).map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const comoUTC = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour === '24' ? '0' : partes.hour),
    Number(partes.minute),
    Number(partes.second),
  );
  return (instante.getTime() - comoUTC) / 60_000;
}

/** Data de competência (YYYY-MM-DD) de um instante, no fuso do usuário. */
export function dataLocal(instante: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** Valores iniciais de <input type="date"> e <input type="time"> para agora. */
export function agoraNoFuso(timezone: string): { data: string; hora: string } {
  const agora = new Date();
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(agora);
  return { data: dataLocal(agora, timezone), hora };
}
