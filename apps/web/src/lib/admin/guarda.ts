import 'server-only';

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Portaria do painel administrativo (seção 22).
 *
 * O papel vive em `app_metadata` do JWT e só o servidor de autenticação
 * escreve lá — o cliente não consegue se promover. Esta checagem é a primeira
 * barreira; a segunda são as próprias funções `admin_*` do banco, que barram
 * quem não é admin na primeira linha, e as policies, que nunca dão ao admin
 * acesso às tabelas financeiras.
 *
 * Responde 404, e não 403: quem não é admin não precisa saber que a rota existe.
 */
export async function exigirAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('is_admin');
  if (error || data !== true) notFound();
}

export async function ehAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('is_admin');
  return data === true;
}
