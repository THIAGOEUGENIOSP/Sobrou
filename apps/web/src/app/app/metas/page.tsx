import { formatMoney, formatPercent, formatRate } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarMetas, ROTULOS_META, type MetaComProgresso } from '@/lib/metas/dados';
import { can } from '@/lib/entitlements';
import { removerMeta } from '@/lib/metas/actions';
import { FormularioMeta } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Metas — Sobrou' };

export default async function MetasPage() {
  const ctx = await carregarContexto();
  const podeUsar = await can('goals');
  const metas = podeUsar ? await carregarMetas(ctx.timezone) : [];

  const jaDefinidas = new Set(metas.map((m) => m.meta.kind));
  const disponiveis = (Object.keys(ROTULOS_META) as Array<keyof typeof ROTULOS_META>).filter(
    (k) => !jaDefinidas.has(k),
  );

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Metas</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Cada meta é medida contra a janela que faz sentido para ela.
      </p>

      {!podeUsar ? (
        <div
          className="rounded-[var(--radius-cartao)] p-6 text-center"
          style={{ background: 'var(--color-papel-suave)' }}
        >
          <p className="font-medium">As metas fazem parte do plano Premium.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Enquanto isso, o dashboard e os relatórios continuam mostrando tudo o que você registra.
          </p>
        </div>
      ) : (
        <>
          {metas.length > 0 && (
            <section className="mb-8 space-y-3">
              {metas.map((m) => (
                <CartaoMeta key={m.meta.id} item={m} />
              ))}
            </section>
          )}

          {disponiveis.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">
                {metas.length > 0 ? 'Criar outra meta' : 'Criar a primeira meta'}
              </h2>
              <FormularioMeta
                tipos={disponiveis.map((k) => ({ chave: k, rotulo: ROTULOS_META[k] }))}
              />
            </section>
          )}

          {metas.length === 0 && disponiveis.length === 0 && (
            <p className="text-sm text-[var(--color-tinta-suave)]">
              Todas as metas possíveis já estão definidas.
            </p>
          )}
        </>
      )}
    </>
  );
}

function formatar(valor: number | null, formato: MetaComProgresso['formato']): string {
  if (formato === 'rs_km') return formatRate(valor, 'km');
  if (formato === 'rs_hora') return formatRate(valor, 'h');
  return formatMoney(valor);
}

function CartaoMeta({ item }: { item: MetaComProgresso }) {
  const { progresso, formato } = item;
  const pct = Math.min(progresso.percentual ?? 0, 100);

  return (
    <article
      className="rounded-[var(--radius-cartao)] p-4"
      style={{ background: 'var(--color-papel-elevado)', boxShadow: 'var(--sombra-cartao)' }}
    >
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-medium">
          {item.rotulo}
          <span className="ml-2 text-xs font-normal text-[var(--color-tinta-suave)]">
            {item.janela}
          </span>
        </h3>
        <form action={removerMeta}>
          <input type="hidden" name="id" value={item.meta.id} />
          <button
            type="submit"
            aria-label={`Remover meta de ${item.rotulo}`}
            className="px-1 text-sm text-[var(--color-tinta-suave)]"
          >
            ✕
          </button>
        </form>
      </div>

      <p className="tabular mb-2 text-2xl font-bold">
        {formatar(progresso.realizado, formato)}
        <span className="text-base font-normal text-[var(--color-tinta-suave)]">
          {' '}
          de {formatar(progresso.alvo, formato)}
        </span>
      </p>

      <div
        role="progressbar"
        aria-label={`Progresso da meta de ${item.rotulo}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="mb-2 h-2.5 overflow-hidden rounded-full"
        style={{ background: 'var(--color-papel-suave)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: progresso.atingida ? 'var(--color-positivo)' : 'var(--color-marca)',
          }}
        />
      </div>

      <p className="text-sm text-[var(--color-tinta-suave)]">
        {progresso.atingida ? (
          <strong className="text-[var(--color-positivo)]">Meta batida.</strong>
        ) : (
          <>
            {formatPercent(progresso.percentual)} atingido.
            {item.ritmoDiario !== null && item.diasRestantes !== null && item.diasRestantes > 0 && (
              <>
                {' '}
                Faltam {formatar(progresso.restante, formato)} —{' '}
                {formatMoney(item.ritmoDiario)} por dia nos {item.diasRestantes} dias que restam.
              </>
            )}
            {item.ritmoDiario === null && item.diasRestantes === 0 && ' Último dia da janela.'}
          </>
        )}
      </p>
    </article>
  );
}
