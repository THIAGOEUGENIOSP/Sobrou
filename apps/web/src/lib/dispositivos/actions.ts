'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { gerarToken } from './token';

/**
 * Aparelhos conectados.
 *
 * Criar e revogar passam pela RLS normalmente — é o dono agindo sobre os
 * próprios tokens. As funções `dispositivo_*` do banco, que ignoram a RLS,
 * ficam só no caminho do app Android, onde não existe sessão.
 */

export type EstadoToken = FormState & {
  /** Só existe na resposta da criação. Não volta a aparecer nunca mais. */
  token?: string;
};

const criarSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Dê um nome ao aparelho.')
    .max(60, 'No máximo 60 caracteres.'),
});

export async function criarToken(_estado: EstadoToken, formData: FormData): Promise<EstadoToken> {
  const parsed = criarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();

  // Um teto por conta. Token esquecido é porta aberta, e ninguém precisa de
  // vinte celulares conectados.
  const { count } = await supabase
    .from('device_tokens')
    .select('id', { count: 'exact', head: true })
    .is('revoked_at', null);

  if ((count ?? 0) >= 5) {
    return { erro: 'Você já tem 5 aparelhos conectados. Revogue um antes de conectar outro.' };
  }

  const novo = gerarToken();

  const { error } = await supabase.from('device_tokens').insert({
    user_id: user.id,
    nome: parsed.data.nome,
    token_hash: novo.hash,
    prefixo: novo.prefixo,
  });

  if (error) return { erro: 'Não foi possível criar o token.' };

  await supabase.from('app_events').insert({
    user_id: user.id,
    event_key: 'dispositivo_conectado',
  });

  revalidatePath('/app/ajustes/dispositivos');

  return {
    token: novo.valor,
    sucesso: 'Token criado. Copie agora — ele não aparece de novo.',
  };
}

export async function revogarToken(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();

  // Revoga, não apaga: a linha continua servindo de registro de que aquele
  // aparelho existiu e até quando escreveu.
  await supabase
    .from('device_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null);

  revalidatePath('/app/ajustes/dispositivos');
}
