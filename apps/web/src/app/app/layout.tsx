import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { registrarConsentimentosPendentes } from '@/lib/auth/actions';
import { ehAdmin } from '@/lib/admin/guarda';
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

  const admin = await ehAdmin();

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-6"
      style={{ paddingBottom: 'calc(6rem + max(env(safe-area-inset-bottom, 0px), 0.75rem))' }}
    >
      <AppNav admin={admin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
