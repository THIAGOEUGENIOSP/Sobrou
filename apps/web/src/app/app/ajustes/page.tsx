import Link from 'next/link';
import { carregarContexto } from '@/lib/dados/contexto';
import { can } from '@/lib/entitlements';
import { CARDS_DISPONIVEIS } from '@/lib/ajustes/cards';
import { FormularioAjustes, FormularioPercentuais } from './formularios';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Ajustes — Sobrou' };

export default async function AjustesPage() {
  const ctx = await carregarContexto();
  const podePersonalizar = await can('dashboard_custom');

  const cardsAtuais = Array.isArray(ctx.settings?.dashboard_cards)
    ? (ctx.settings.dashboard_cards as string[])
    : CARDS_DISPONIVEIS.map(([k]) => k as string);

  return (
    <>
      <h1 className="mb-6 text-xl font-bold">Ajustes</h1>

      <section className="mb-10">
        <h2 className="mb-1 font-semibold">Divisão do resultado</h2>
        <p className="mb-4 text-sm text-[var(--color-tinta-suave)]">
          Depois de descontar combustível e despesas, o que sobra é dividido assim.
        </p>
        <FormularioPercentuais atual={ctx.allocation} />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Como o app calcula</h2>
        <p className="mb-4 text-sm text-[var(--color-tinta-suave)]">
          Estas escolhas mudam o custo de combustível dos próximos turnos.
        </p>
        <FormularioAjustes
          fuelPriceMode={ctx.settings?.fuel_price_mode ?? 'ultimo'}
          cashbackAbate={ctx.settings?.cashback_reduces_cost ?? true}
          rideCostBasis={ctx.settings?.ride_cost_basis ?? 'total'}
          cards={CARDS_DISPONIVEIS.map(([chave, rotulo]) => ({
            chave,
            rotulo,
            ativo: cardsAtuais.includes(chave),
          }))}
          podePersonalizar={podePersonalizar}
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-1 font-semibold">Aparelhos conectados</h2>
        <p className="mb-4 text-sm text-[var(--color-tinta-suave)]">
          O KM Legal, que lê a tela da Uber no celular, manda as corridas para cá e usa o seu custo
          por km real em vez do valor digitado no cadastro dele.
        </p>
        <Link
          href="/app/ajustes/dispositivos"
          className="inline-flex rounded-full border border-[var(--color-borda)] px-5 py-2.5 font-semibold"
        >
          Gerenciar aparelhos
        </Link>
      </section>
    </>
  );
}
