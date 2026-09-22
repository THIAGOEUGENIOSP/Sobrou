import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Registro de erros (seção 20).
 *
 * Duas regras, e a segunda é a que importa:
 *
 * 1. Registrar erro NUNCA pode quebrar o fluxo. Se a gravação falhar, o
 *    usuário não fica sabendo — ele já está lidando com um problema, não
 *    precisa de dois.
 *
 * 2. O contexto não carrega dinheiro nem dado pessoal. O log existe para
 *    consertar o sistema, e o painel administrativo o exibe. Gravar
 *    faturamento aqui seria furar, pela porta dos fundos, a regra de que o
 *    admin não vê dado financeiro de ninguém.
 */

/** Chaves cujo valor jamais vai para o log, venham de onde vierem. */
const PROIBIDAS = [
  'valor', 'faturamento', 'disponivel', 'reserva', 'custo', 'litros', 'preco',
  'saldo', 'senha', 'password', 'token', 'email', 'cpf', 'odometro',
];

type ValorSimples = string | number | boolean;

function limpar(contexto: Record<string, unknown>): Record<string, ValorSimples> {
  const saida: Record<string, ValorSimples> = {};

  for (const [chave, valor] of Object.entries(contexto)) {
    const baixa = chave.toLowerCase();
    if (PROIBIDAS.some((p) => baixa.includes(p))) {
      saida[chave] = '[omitido]';
      continue;
    }
    // Só tipos simples: objeto aninhado escaparia da filtragem acima.
    saida[chave] =
      typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean'
        ? valor
        : String(valor);
  }

  return saida;
}

export async function registrarErro(
  mensagem: string,
  contexto: Record<string, unknown> = {},
  nivel: 'warn' | 'error' | 'fatal' = 'error',
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      level: nivel,
      message: mensagem.slice(0, 500),
      context: limpar(contexto),
    });
  } catch {
    // Ver a regra 1 acima.
  }
}

/** Marca um evento de uso. Sem valor financeiro — é contagem, não extrato. */
export async function registrarEvento(
  chave: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('app_events').insert({
      user_id: user.id,
      event_key: chave,
      metadata: limpar(metadata),
    });
  } catch {
    // Telemetria nunca derruba o fluxo.
  }
}
