import { z } from 'zod';

/**
 * Schemas compartilhados entre formulário e servidor.
 *
 * O cliente valida para dar retorno rápido; o servidor valida de novo porque
 * validação de frontend não é validação (seção 20). O mesmo schema nos dois
 * lados evita que as regras divirjam com o tempo.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .email('E-mail inválido.')
  .transform((v) => v.toLowerCase());

export const senhaSchema = z
  .string()
  .min(8, 'A senha precisa ter ao menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.');

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe sua senha.'),
  proximo: z.string().optional(),
});

export const cadastroSchema = z
  .object({
    nome: z.string().trim().max(80).optional(),
    email: emailSchema,
    senha: senhaSchema,
    confirmacao: z.string(),
    aceite: z.literal('on', {
      errorMap: () => ({ message: 'É preciso aceitar os termos e a política de privacidade.' }),
    }),
  })
  .refine((d) => d.senha === d.confirmacao, {
    path: ['confirmacao'],
    message: 'As senhas não conferem.',
  });

export const recuperarSchema = z.object({ email: emailSchema });

export const novaSenhaSchema = z
  .object({ senha: senhaSchema, confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, {
    path: ['confirmacao'],
    message: 'As senhas não conferem.',
  });

/** Estado devolvido pelas Server Actions para o formulário. */
export type FormState = {
  erro?: string;
  campos?: Record<string, string>;
  sucesso?: string;
};

export function erroDeZod(error: z.ZodError): FormState {
  const campos: Record<string, string> = {};
  for (const issue of error.issues) {
    const chave = String(issue.path[0] ?? '_');
    campos[chave] ??= issue.message;
  }
  return { campos, erro: 'Confira os campos destacados.' };
}
