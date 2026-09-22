import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv, serviceRoleKey } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Cliente do servidor, amarrado aos cookies da sessão.
 *
 * Toda consulta feita por aqui ainda passa pela RLS: o servidor não é um
 * atalho para ler dado de outro usuário. Nenhuma rota aceita `user_id` vindo
 * do cliente — o id sai sempre da sessão, via `requireUser()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component não pode escrever cookie. O middleware já
            // renovou a sessão nesta requisição, então isso é seguro ignorar.
          }
        },
      },
    },
  );
}

/**
 * Usuário autenticado da requisição.
 *
 * Usa `getUser()`, que valida o token no servidor de autenticação. Ler o
 * usuário da sessão do cookie seria mais rápido e não confiável: o cookie
 * pode ser forjado.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Como `getUser`, mas lança quando não há sessão. Use em toda rota protegida. */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error('NAO_AUTENTICADO');
  return user;
}

/**
 * Cliente administrativo, que IGNORA a RLS.
 *
 * Uso restrito: webhook de pagamento (escrever em `subscriptions`) e tarefas
 * de manutenção. Nunca deve ser usado para servir uma requisição de usuário —
 * é aqui que vazamento entre contas nasceria.
 */
export function createServiceClient() {
  return createRawClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
