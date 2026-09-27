import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { registrarConsentimentosPendentes } from '@/lib/auth/actions';
import { ehAdmin } from '@/lib/admin/guarda';
import { BotaoSair } from '@/components/botao-sair';
import { AppNav } from '@/components/app-nav';

export const dynamic = 'force-dynamic';

/**
 * Casca do app autenticado.
 *
 * Este guard é conveniência, não a autorização de verdade: mesmo que ele
 * falhasse, a RLS no banco continuaria impedindo um usuário de ler dado de
 * outro. São duas camadas de propósito.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  await registrarConsentimentosPendentes();

  const { data: perfil } = await supabase
    .from('profiles')
    .select('onboarding_done, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!perfil?.onboarding_done) redirect('/onboarding');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-6 pb-10">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/app" className="font-bold">
          Sobrou
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {(await ehAdmin()) && (
            <Link href="/admin" className="text-[var(--color-marca)]">
              Admin
            </Link>
          )}
          <Link href="/app/ajustes" className="text-[var(--color-tinta-suave)]">
            Ajustes
          </Link>
          <Link href="/app/conta" className="text-[var(--color-tinta-suave)]">
            Conta
          </Link>
          <BotaoSair className="text-[var(--color-tinta-suave)]" />
        </nav>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <AppNav />
    </div>
  );
}
