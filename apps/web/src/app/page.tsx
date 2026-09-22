import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Landing pública. Lê os planos direto do banco: mudar preço ou limite no
 * admin muda esta página, sem deploy.
 */
export default async function Home() {
  const supabase = await createClient();

  const { data: planos } = await supabase
    .from('plans')
    .select('code, name, description, price_monthly, price_yearly, trial_days')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-20">
      <header className="mb-12">
        <p className="text-sm font-semibold tracking-wide text-[var(--color-marca)] uppercase">
          Sobrou
        </p>
        <h1 className="mt-3 text-3xl leading-tight font-bold sm:text-5xl">
          Faturou não é <em className="not-italic text-[var(--color-marca)]">sobrou</em>.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-tinta-suave)]">
          No fim do dia o app do motorista mostra quanto entrou. Não mostra quanto ficou. O Sobrou
          desconta o combustível pelo preço que você pagou de verdade na bomba, separa a reserva do
          carro e diz o número que importa: o que sobrou para você.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/cadastro"
            className="inline-flex items-center rounded-full bg-[var(--color-marca)] px-6 py-3 font-semibold text-white"
          >
            Começar grátis
          </Link>
          <Link
            href="/entrar"
            className="inline-flex items-center rounded-full border border-[var(--color-borda)] px-6 py-3 font-semibold"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section aria-labelledby="como" className="mb-12">
        <h2 id="como" className="mb-4 text-xl font-semibold">
          O que o app responde
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            'Quanto gastei de combustível hoje, pelo preço real do litro',
            'Quanto estou ganhando por km e por hora',
            'Quanto separar para manutenção e para emergência',
            'Quanto do que está reservado ainda não foi gasto',
            'Se esta corrida paga o que ela custa',
            'Se hoje o etanol compensa mais que a gasolina no meu carro',
          ].map((item) => (
            <li
              key={item}
              className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="planos" className="mb-12">
        <h2 id="planos" className="mb-4 text-xl font-semibold">
          Planos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(planos ?? []).map((plano) => (
            <article
              key={plano.code}
              className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-5"
            >
              <h3 className="font-semibold">{plano.name}</h3>
              <p className="tabular mt-1 text-2xl font-bold">
                {plano.price_monthly > 0
                  ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(plano.price_monthly)
                  : 'Grátis'}
                {plano.price_monthly > 0 && (
                  <span className="text-base font-normal text-[var(--color-tinta-suave)]">/mês</span>
                )}
              </p>
              {plano.description && (
                <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">{plano.description}</p>
              )}
              {plano.trial_days > 0 && (
                <p className="mt-2 text-sm text-[var(--color-marca)]">
                  {plano.trial_days} dias de teste
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="flex gap-4 border-t border-[var(--color-borda)] pt-6 text-sm text-[var(--color-tinta-suave)]">
        <Link href="/termos">Termos de uso</Link>
        <Link href="/privacidade">Política de privacidade</Link>
      </footer>
    </main>
  );
}
