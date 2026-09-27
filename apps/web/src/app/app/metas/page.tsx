import Link from 'next/link';
import { formatMoney, formatPercent, formatRate } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarMetas, ROTULOS_META, type MetaComProgresso } from '@/lib/metas/dados';
import { can } from '@/lib/entitlements';
import { removerMeta } from '@/lib/metas/actions';
import { BotaoSino } from '@/components/cabecalho';
import { FormularioMeta } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Metas — Sobrou' };

/** "Mais opções" (mockup, seção 15): os outros lugares onde metas e reservas
 * de fato vivem no app — nada aqui é uma tela nova, é atalho pro que já existe. */
const MAIS_OPCOES = [
  {
    href: '/app/ajustes',
    rotulo: 'Veículo',
    descricao: 'Consumo, hodômetro',
    icone: <path d="M8 3h8l2 6H6l2-6ZM4 9h16l1 4H3l1-4ZM7 17v3M17 17v3M6 13h12v4H6z" />,
  },
  {
    href: '/app/reservas',
    rotulo: 'Reservas',
    descricao: 'Emergência, manutenção',
    icone: (
      <>
        <rect x="3.5" y="10" width="17" height="9" rx="2" />
        <path d="M7 10V8a5 5 0 0 1 10 0v2" />
      </>
    ),
  },
  {
    href: '/app/abastecimentos',
    rotulo: 'Postos',
    descricao: 'Encontre os melhores preços',
    icone: <path d="M12 3s6 6.5 6 10.5a6 6 0 1 1-12 0C6 9.5 12 3 12 3Z" />,
  },
  {
    href: '/app/consultor',
    rotulo: 'Consultor',
    descricao: 'Insights e análises',
    icone: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3V16h5.8v-.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" />,
  },
  {
    href: '/app/ajustes',
    rotulo: 'Ajustes',
    descricao: 'Personalize o app',
    icone: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.37.58.66.77.29.19.63.29.99.29H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),
  },
] as const;

export default async function MetasPage() {
  const ctx = await carregarContexto();
  const podeUsar = await can('goals');
  const metas = podeUsar ? await carregarMetas(ctx.timezone) : [];

  const jaDefinidas = new Set(metas.map((m) => m.meta.kind));
  const disponiveis = (Object.keys(ROTULOS_META) as Array<keyof typeof ROTULOS_META>).filter(
    (k) => !jaDefinidas.has(k),
  );

  // A meta mensal de faturamento vira o cartão principal (mockup) quando
  // existe — é a mais parecida com "meta do mês" que o motorista pensa de
  // cara. As demais (se houver) continuam listadas abaixo, sem sumir.
  const metaMensal = metas.find((m) => m.meta.kind === 'fat_mensal');
  const outrasMetas = metas.filter((m) => m.meta.kind !== 'fat_mensal');

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold">Metas</h1>
        <BotaoSino />
      </div>
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
          {metaMensal && <CartaoMetaMensal item={metaMensal} />}

          {outrasMetas.length > 0 && (
            <section className="mb-8 space-y-3">
              {outrasMetas.map((m) => (
                <CartaoMeta key={m.meta.id} item={m} />
              ))}
            </section>
          )}

          <section className="mb-8">
            <h2 className="mb-3 font-semibold">Mais opções</h2>
            <div
              className="divide-y overflow-hidden rounded-[var(--radius-cartao)] border"
              style={{ borderColor: 'var(--color-borda)' }}
            >
              {MAIS_OPCOES.map((opcao) => (
                <Link
                  key={opcao.href}
                  href={opcao.href}
                  className="flex items-center gap-3 p-4"
                  style={{ background: 'var(--color-papel-elevado)' }}
                >
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-[0.65rem]"
                    style={{ background: 'var(--color-papel-suave)', color: 'var(--color-marca)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      {opcao.icone}
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{opcao.rotulo}</span>
                    <span className="block truncate text-xs text-[var(--color-tinta-suave)]">
                      {opcao.descricao}
                    </span>
                  </span>
                  <span aria-hidden className="flex-none text-[var(--color-tinta-suave)]">
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </section>

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

/** Cartão principal da tela (mockup): a meta mensal, em destaque, com a
 * mesma linguagem visual do cartão "Sobrou" do Painel — valor grande,
 * barra de progresso, e o que falta escrito por extenso. */
function CartaoMetaMensal({ item }: { item: MetaComProgresso }) {
  const { progresso, formato } = item;
  const pct = Math.min(progresso.percentual ?? 0, 100);

  return (
    <section className="mb-6">
      <div
        className="rounded-[var(--radius-cartao)] p-5"
        style={{ background: 'var(--color-papel-elevado)', boxShadow: 'var(--sombra-cartao)' }}
      >
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Meta mensal</h2>
          <span className="tabular text-sm text-[var(--color-tinta-suave)]">
            {formatar(progresso.alvo, formato)}
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="tabular text-3xl font-extrabold">{formatar(progresso.realizado, formato)}</p>
          <span
            className="tabular flex-none rounded-full px-2.5 py-1 text-sm font-bold"
            style={{
              color: progresso.atingida ? 'var(--color-positivo)' : 'var(--color-marca)',
              background: progresso.atingida ? 'var(--color-positivo-suave)' : 'var(--color-marca-suave)',
            }}
          >
            {formatPercent(progresso.percentual, 0)}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Progresso da meta mensal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="mt-3 h-2.5 overflow-hidden rounded-full"
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

        <p className="mt-3 flex items-center justify-between text-sm text-[var(--color-tinta-suave)]">
          <span>
            {formatar(progresso.realizado, formato)} já alcançados
          </span>
          <span>
            {progresso.atingida ? (
              <strong className="text-[var(--color-positivo)]">Meta batida</strong>
            ) : (
              <>Faltam {formatar(progresso.restante, formato)}</>
            )}
          </span>
        </p>

        {!progresso.atingida && item.ritmoDiario !== null && item.diasRestantes !== null && item.diasRestantes > 0 && (
          <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
            {formatMoney(item.ritmoDiario)} por dia nos {item.diasRestantes} dias que restam.
          </p>
        )}

        <form action={removerMeta} className="mt-3">
          <input type="hidden" name="id" value={item.meta.id} />
          <button type="submit" className="text-xs text-[var(--color-tinta-suave)] underline">
            Remover meta mensal
          </button>
        </form>
      </div>
    </section>
  );
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
