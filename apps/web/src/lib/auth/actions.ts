'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { rotaInterna } from '@/lib/rotas';
import {
  cadastroSchema,
  erroDeZod,
  loginSchema,
  novaSenhaSchema,
  recuperarSchema,
  type FormState,
} from './schemas';

/**
 * Autenticação (seções 2 e 20).
 *
 * O hash da senha, a confirmação de e-mail, o token de recuperação e o rate
 * limit de tentativas são do Supabase Auth. Aqui ficam só as regras do KM
 * Legal: validar, registrar o aceite dos documentos e redirecionar.
 */

async function urlDoApp(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Mensagens do Supabase são em inglês; traduzimos as que o usuário vê. */
function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('user already registered')) return 'Já existe uma conta com este e-mail.';
  if (m.includes('for security purposes') || m.includes('rate limit')) {
    return 'Muitas tentativas. Espere alguns instantes e tente de novo.';
  }
  if (m.includes('password')) return 'Senha inválida. Use ao menos 8 caracteres.';
  return 'Não foi possível concluir. Tente novamente.';
}

export async function entrar(_estado: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) return { erro: traduzir(error.message) };

  redirect(rotaInterna(parsed.data.proximo));
}

export async function cadastrar(_estado: FormState, formData: FormData): Promise<FormState> {
  const parsed = cadastroSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const supabase = await createClient();

  // As versões vigentes dos documentos que o usuário está aceitando agora.
  const { data: docs } = await supabase
    .from('legal_documents')
    .select('id')
    .eq('is_current', true);

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      emailRedirectTo: `${await urlDoApp()}/auth/callback?proximo=/onboarding`,
      data: {
        display_name: parsed.data.nome || null,
        // Gravado aqui e persistido em `consents` na primeira sessão: no
        // cadastro com confirmação de e-mail ainda não há sessão para gravar.
        aceite_documentos: (docs ?? []).map((d) => d.id),
        aceite_em: new Date().toISOString(),
      },
    },
  });

  if (error) return { erro: traduzir(error.message) };

  // Sem sessão = o projeto exige confirmação por e-mail.
  if (!data.session) {
    return {
      sucesso:
        'Conta criada. Enviamos um e-mail de confirmação — abra o link para ativar seu acesso.',
    };
  }

  redirect('/onboarding');
}

export async function recuperarSenha(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = recuperarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await urlDoApp()}/auth/callback?proximo=/nova-senha`,
  });

  // Resposta idêntica exista ou não a conta: dizer "este e-mail não existe"
  // entrega a lista de clientes para quem estiver testando endereços.
  return {
    sucesso: 'Se existir uma conta com este e-mail, o link de recuperação já está a caminho.',
  };
}

export async function definirNovaSenha(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = novaSenhaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: 'O link expirou. Peça um novo e-mail de recuperação.' };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) return { erro: traduzir(error.message) };

  redirect('/app');
}

export async function sair(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/**
 * Persiste em `consents` o aceite registrado no cadastro.
 *
 * Idempotente: roda na primeira carga autenticada e não faz nada depois.
 * O aceite aponta para a versão exata do documento que estava vigente quando
 * o usuário marcou a caixa, não para a versão de hoje.
 */
export async function registrarConsentimentosPendentes(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const aceites = user.user_metadata?.aceite_documentos;
  if (!Array.isArray(aceites) || aceites.length === 0) return;

  const { data: jaRegistrados } = await supabase
    .from('consents')
    .select('document_id')
    .eq('user_id', user.id);

  const registrados = new Set((jaRegistrados ?? []).map((c) => c.document_id));
  const faltando = aceites.filter((id: unknown): id is string => typeof id === 'string' && !registrados.has(id));
  if (faltando.length === 0) return;

  await supabase.from('consents').insert(
    faltando.map((document_id) => ({
      user_id: user.id,
      document_id,
      accepted_at: user.user_metadata?.aceite_em ?? new Date().toISOString(),
    })),
  );
}
