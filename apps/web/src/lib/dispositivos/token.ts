import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Token de aparelho.
 *
 * O app Android precisa falar com o servidor sem sessão de navegador. A
 * alternativa seria guardar e-mail e senha do motorista dentro de um app que
 * fica rodando em segundo plano com permissão de acessibilidade — o que é
 * pedir para um dia dar muito errado. O token resolve isso e tem duas
 * propriedades que a senha não tem: dá para revogar um aparelho sem mexer nos
 * outros, e ele não abre nada além das duas operações da sincronização.
 *
 * O banco guarda só o SHA-256. Quem gera e quem confere é aqui; o valor cru
 * nunca vira parâmetro de query, então não aparece em log do Postgres nem em
 * backup. Consequência assumida: token perdido não se recupera, se revoga e
 * se gera outro. É o comportamento certo — um token que o servidor consegue
 * ler de volta é um token que vaza junto com o banco.
 */

const PREFIXO = 'sbr_';

export interface TokenNovo {
  /** Mostrado uma única vez, na hora da criação. */
  valor: string;
  hash: string;
  prefixo: string;
}

export function gerarToken(): TokenNovo {
  // 32 bytes = 256 bits de entropia. Não há força bruta viável contra isso,
  // que é o motivo de a rota do aparelho poder ser pública.
  const valor = PREFIXO + randomBytes(32).toString('base64url');
  return { valor, hash: hashToken(valor), prefixo: valor.slice(0, 12) };
}

export function hashToken(valor: string): string {
  return createHash('sha256').update(valor.trim(), 'utf8').digest('hex');
}

/**
 * Lê o token do cabeçalho `Authorization: Bearer ...`.
 * Devolve null em qualquer formato inesperado — sem mensagem de erro
 * detalhada, que só ajudaria quem está sondando.
 */
export function tokenDoCabecalho(header: string | null): string | null {
  if (!header) return null;
  const partes = header.split(' ');
  if (partes.length !== 2 || partes[0]?.toLowerCase() !== 'bearer') return null;
  const valor = partes[1]?.trim();
  if (!valor || !valor.startsWith(PREFIXO) || valor.length > 200) return null;
  return valor;
}

/** Comparação de hashes em tempo constante, para não vazar por cronometragem. */
export function hashesIguais(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
