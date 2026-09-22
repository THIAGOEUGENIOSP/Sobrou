import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { can } from '@/lib/entitlements';
import { FormularioRegras } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Minhas regras — Sobrou' };

export default async function RegrasPage() {
  const podeUsar = await can('ride_analyzer');
  const supabase = await createClient();

  const { data: regras } = podeUsar
    ? await supabase.from('ride_rules').select('*').eq('is_active', true).maybeSingle()
    : { data: null };

  const texto = (v: number | null | undefined) =>
    v === null || v === undefined ? '' : String(v).replace('.', ',');

  return (
    <>
      <Link href="/app/corrida" className="text-sm text-[var(--color-marca)]">
        ← Vale a pena?
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">Minhas regras</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Deixe em branco o que você não quer que entre na decisão.
      </p>

      {!podeUsar ? (
        <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">O analisador de corridas faz parte do plano Premium.</p>
        </div>
      ) : (
        <FormularioRegras
          valores={{
            valor_min: texto(regras?.valor_min),
            rs_km_min: texto(regras?.rs_km_min),
            rs_hora_min: texto(regras?.rs_hora_min),
            dist_max_busca: texto(regras?.dist_max_busca),
            nota_min: texto(regras?.nota_min),
            margem_min: texto(regras?.margem_min),
          }}
        />
      )}
    </>
  );
}
