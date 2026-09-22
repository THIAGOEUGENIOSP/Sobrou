import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { registrarConsentimentosPendentes } from '@/lib/auth/actions';
import { FormularioOnboarding } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Primeiros passos — Sobrou' };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  // Primeira carga autenticada: grava o aceite feito no cadastro.
  await registrarConsentimentosPendentes();

  const { data: perfil } = await supabase
    .from('profiles')
    .select('onboarding_done, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (perfil?.onboarding_done) redirect('/app');

  const { data: templates } = await supabase
    .from('templates')
    .select('id, code, name, description')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">
        {perfil?.display_name ? `Boas-vindas, ${perfil.display_name}` : 'Boas-vindas'}
      </h1>
      <p className="mb-8 text-sm text-[var(--color-tinta-suave)]">
        Três informações e o app já começa a calcular. Tudo isso pode mudar depois.
      </p>

      <FormularioOnboarding templates={templates ?? []} />
    </main>
  );
}
