import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rotaInterna } from '@/lib/rotas';

/**
 * Destino dos links de e-mail: confirmação de cadastro e recuperação de senha.
 * Troca o código por uma sessão e leva o usuário para onde ele ia.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  // Só aceita caminho interno — ver `rotaInterna`.
  const proximo = rotaInterna(searchParams.get('proximo'));

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/entrar?erro=link_expirado`);
  }

  return NextResponse.redirect(`${origin}${proximo}`);
}
