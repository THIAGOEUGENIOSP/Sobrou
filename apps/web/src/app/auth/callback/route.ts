import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Destino dos links de e-mail: confirmação de cadastro e recuperação de senha.
 * Troca o código por uma sessão e leva o usuário para onde ele ia.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const proximoParam = searchParams.get('proximo');
  // Só aceita caminho interno: `proximo=https://site-falso` viraria um
  // redirecionamento aberto, prato cheio para phishing.
  const proximo = proximoParam?.startsWith('/') ? proximoParam : '/app';

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
