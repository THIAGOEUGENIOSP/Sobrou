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
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
