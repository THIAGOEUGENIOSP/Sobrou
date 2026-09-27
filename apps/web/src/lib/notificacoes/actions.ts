'use server';

import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';

/**
 * Server actions do toggle de notificações (tela de Ajustes).
 *
 * A permissão do navegador e a chamada a `pushManager.subscribe()` só podem
 * acontecer no cliente; aqui só persistimos o resultado, sempre amarrado ao
 * usuário da sessão — o mesmo motivo de `ajustes/actions.ts` nunca aceitar um
 * `user_id` vindo do formulário.
 */

const inscricaoSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function salvarInscricaoPush(
  inscricao: unknown,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const parsed = inscricaoSchema.safeParse(inscricao);
  if (!parsed.success) return { ok: false, erro: 'Inscrição inválida.' };

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) return { ok: false, erro: 'Não foi possível salvar a inscrição.' };
  return { ok: true };
}

export async function removerInscricaoPush(
  endpoint: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) return { ok: false, erro: 'Não foi possível remover a inscrição.' };
  return { ok: true };
}

/** Se este navegador (pelo endpoint salvo no cliente) já está inscrito. */
export async function inscricaoAtivaPush(endpoint: string | null): Promise<boolean> {
  if (!endpoint) return false;
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)
    .maybeSingle();

  return data !== null;
}
