import { z } from 'zod';

/**
 * Validação das variáveis de ambiente.
 *
 * Falhar no boot com uma mensagem clara é melhor do que descobrir em produção
 * que a chave do banco estava vazia.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL válida.'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não foi definida.'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  /** Chave pública VAPID, usada pelo navegador para se inscrever nas notificações push. */
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(20).optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

/**
 * Chave de serviço. Só pode ser lida no servidor — ela ignora RLS.
 * Usada apenas em webhook de pagamento e tarefas administrativas.
 */
export function serviceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('A chave de serviço nunca deve ser lida no navegador.');
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não foi definida.');
  return key;
}

/** Chave privada VAPID. Assina as notificações push — nunca pode ir ao navegador. */
export function vapidPrivateKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('A chave privada VAPID nunca deve ser lida no navegador.');
  }
  const key = process.env.VAPID_PRIVATE_KEY;
  if (!key) throw new Error('VAPID_PRIVATE_KEY não foi definida.');
  return key;
}

/** Endereço de contato exigido pelo protocolo VAPID (um "mailto:" ou uma URL "https:"). */
export function vapidSubject(): string {
  const subject = process.env.VAPID_SUBJECT;
  if (!subject) throw new Error('VAPID_SUBJECT não foi definida.');
  return subject;
}

/** Segredo que autentica a chamada do Vercel Cron à rota de avisos. */
export function cronSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET não foi definida.');
  return secret;
}
