import Link from 'next/link';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarConsultor, type Insight, type Severidade } from '@/lib/consultor/dados';
import { can } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Consultor — Sobrou' };

const CORES: Record<Severidade, { texto: string; fundo: string }> = {
  positivo: { texto: 'var(--color-positivo)', fundo: 'var(--color-positivo-suave)' },
  aviso: { texto: 'var(--color-aviso)', fundo: 'var(--color-aviso-suave)' },
  alerta: { texto: 'var(--color-alerta)', fundo: 'var(--color-alerta-suave)' },
  neutro: { texto: 'var(--color-marca)', fundo: 'var(--color-marca-suave)' },
};

const ICONES: Record<string, React.ReactNode> = {
  combustivel: (
    <path d="M12 3s6 6.5 6 10.5a6 6 0 1 1-12 0C6 9.5 12 3 12 3Z" />
  ),
  'melhor-dia': <path d="M12 7.5V12l3 2M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z" />,
  'projecao-mes': <path d="M4 16l5-5 4 4 7-7M15 7h5v5" />,
  manutencao: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.3-.7-.7-2.3 2.6-2.6Z" />
  ),
};

function Icone({ id, cor }: { id: string; cor: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONES[id] ?? <circle cx="12" cy="12" r="8.5" />}
    </svg>
  );
}

function CartaoInsight({ item }: { item: Insight }) {
  const cor = CORES[item.severidade];
  return (
    <article className="cartao flex gap-3 p-4">
      <div
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[0.65rem]"
        style={{ background: cor.fundo }}
      >
        <Icone id={item.id} cor={cor.texto} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">{item.titulo}</h3>
          {item.chip && (
            <span
              className="tabular flex-none rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ color: cor.texto, background: cor.fundo }}
            >
              {item.chip}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-tinta-suave)]">
          {item.corpo}
        </p>
      </div>
    </article>
  );
}

export default async function ConsultorPage() {
  // Reaproveita o mesmo controle de plano das comparações de período: o
  // consultor é, no fundo, uma leitura comparativa do histórico.
  const podeUsar = await can('monthly_compare');
  const ctx = await carregarContexto();
  const dados = podeUsar ? await carregarConsultor(ctx) : null;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Seu consultor</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Leituras tiradas do seu próprio histórico — nada aqui é genérico.
      </p>

      {!podeUsar ? (
        <div className="cartao p-6 text-center">
          <p className="font-medium">O consultor faz parte do plano Premium.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Enquanto isso, o dashboard e os relatórios continuam mostrando tudo o que você
            registra.
          </p>
        </div>
      ) : (
        <>
          {dados && dados.saudeFinanceira !== null && (
            <section className="cartao mb-5 p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[11px] font-semibold tracking-wide text-[var(--color-tinta-suave)] uppercase">
                  Saúde financeira · últimos 30 dias
                </span>
                <span className="tabular text-xl font-extrabold" style={{ color: 'var(--color-marca)' }}>
                  {dados.saudeFinanceira}
                  <span className="text-sm font-medium text-[var(--color-tinta-suave)]">/100</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--color-papel-suave)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${dados.saudeFinanceira}%`, background: 'var(--color-marca)' }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
                Baseada na sua margem operacional — o que sobra depois de combustível, manutenção e
                despesas, em relação ao faturamento.
              </p>
            </section>
          )}

          {dados && dados.insights.length > 0 ? (
            <section className="space-y-3">
              {dados.insights.map((item) => (
                <CartaoInsight key={item.id} item={item} />
              ))}
            </section>
          ) : (
            <div className="cartao border-dashed p-6 text-center">
              <p className="font-medium">Ainda não dá pra dizer nada com segurança.</p>
              <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                Feche mais alguns turnos — o consultor precisa de um pouco de histórico pra comparar
                semanas e apontar padrões de verdade, em vez de chutar.
              </p>
            </div>
          )}

          <p className="mt-6 text-sm text-[var(--color-tinta-suave)]">
            Metas e reservas por objetivo ficam em{' '}
            <Link href="/app/metas" className="text-[var(--color-marca)]">
              Metas
            </Link>{' '}
            e{' '}
            <Link href="/app/reservas" className="text-[var(--color-marca)]">
              Reservas
            </Link>
            .
          </p>
        </>
      )}
    </>
  );
}
