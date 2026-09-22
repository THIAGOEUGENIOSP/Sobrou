import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';
import type { Database } from './database.types';

/** Rotas que qualquer visitante pode abrir. Todo o resto exige sessão. */
const ROTAS_PUBLICAS = [
  '/',
  '/entrar',
  '/cadastro',
  '/recuperar-senha',
  '/nova-senha',
  '/termos',
  '/privacidade',
  '/auth/callback',
  // Precisa ser pública: o service worker a serve justamente quando não há
  // rede para validar sessão nenhuma.
  '/offline',
];

function ehPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

/**
 * Rotas que se autenticam por token de aparelho, não por cookie.
 *
 * O app Android não tem sessão de navegador — é para isso que o token existe.
 * Sem esta exceção o middleware responderia um 302 para `/entrar`, e o app
 * receberia a página HTML de login achando que era a resposta da API.
 */
function ehRotaDeAparelho(pathname: string): boolean {
  return pathname === '/api/dispositivo' || pathname.startsWith('/api/dispositivo/');
}

/**
 * Renova a sessão a cada requisição e barra rota protegida sem login.
 *
 * Isso é conveniência e primeira barreira, não a autorização de verdade:
 * quem garante o isolamento é a RLS no banco, que vale mesmo se este
 * middleware tiver um bug.
 */
export async function updateSession(request: NextRequest) {
  // A rota do aparelho passa reto: ela confere o token sozinha, e nem o
  // cookie de um navegador logado no mesmo domínio deve influenciar nela.
  if (ehRotaDeAparelho(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !ehPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.searchParams.set('proximo', pathname);
    return NextResponse.redirect(url);
  }

  // Quem já entrou não precisa ver a tela de login de novo.
  if (user && (pathname === '/entrar' || pathname === '/cadastro')) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
