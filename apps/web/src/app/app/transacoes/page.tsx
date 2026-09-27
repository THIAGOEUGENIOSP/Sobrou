import Link from 'next/link';
import { formatMoney } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarTransacoes, type ItemTransacao } from '@/lib/transacoes/dados';
import { resolverPeriodoDoUsuario } from '@/lib/relatorios/periodo';
import { BotaoNovaTransacao } from './botao-nova';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Transações — Sobrou' };

const ABAS: Array<{ chave: 'entrada' | 'saida'; rotulo: string }> = [
  { chave: 'entrada', rotulo: 'Entradas' },
  { chave: 'saida', rotulo: 'Saídas' },
];

function rotuloDia(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  const dataFmt = d.toLocaleDateString('pt-BR');
  const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${dataFmt} · ${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}`;
}

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  const tipo: 'entrada' | 'saida' = sp.tipo === 'saida' ? 'saida' : 'entrada';

  const periodo = resolverPeriodoDoUsuario('mes', ctx.timezone);
  const itens = await carregarTransacoes(periodo.de, periodo.ate);
  const filtrados = itens.filter((i) => i.tipo === tipo);

  const porDia = new Map<string, ItemTransacao[]>();
  for (const item of filtrados) {
    const lista = porDia.get(item.data) ?? [];
    lista.push(item);
    porDia.set(item.data, lista);
  }
  const dias = [...porDia.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Transações</h1>
      <p className="mb-5 text-sm text-[var(--color-tinta-suave)]">
        {periodo.rotulo} ·{' '}
        <Link href="/app/relatorios" className="text-[var(--color-marca)]">
          ver outro período
        </Link>
      </p>

      <div
        className="mb-6 grid grid-cols-2 gap-1 rounded-full p-1"
        style={{ background: 'var(--color-papel-suave)' }}
      >
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={`/app/transacoes?tipo=${a.chave}`}
            className="rounded-full py-2 text-center text-sm font-medium"
            style={
              a.chave === tipo
                ? { background: 'var(--color-marca)', color: '#fff' }
                : { color: 'var(--color-tinta-suave)' }
            }
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {dias.length === 0 ? (
        <div className="rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nada por aqui ainda {periodo.rotulo.toLowerCase()}.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            {tipo === 'entrada'
              ? 'Feche um turno pra registrar receita por plataforma.'
              : 'Lance uma despesa, um abastecimento ou uma manutenção.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {dias.map((dia) => {
            const itensDia = porDia.get(dia)!;
            const totalDia = itensDia.reduce((a, i) => a + i.valor, 0);
            return (
              <div key={dia}>
                <div className="mb-2 flex items-baseline justify-between text-xs">
                  <span className="font-medium text-[var(--color-tinta-suave)]">{rotuloDia(dia)}</span>
                  <span className="tabular font-semibold">{formatMoney(totalDia)}</span>
                </div>
                <ul className="space-y-2">
                  {itensDia.map((item) => (
                    <li key={item.id}>
                      <LinhaTransacao item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <BotaoNovaTransacao />
    </>
  );
}

function LinhaTransacao({ item }: { item: ItemTransacao }) {
  const conteudo = (
    <div
      className="flex items-center gap-3 rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-3"
      style={{ background: 'var(--color-papel-elevado)' }}
    >
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-[0.7rem] text-sm font-bold text-white"
        style={{ background: item.cor ?? 'var(--color-tinta-fraca)' }}
        aria-hidden
      >
        {item.titulo.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.titulo}</span>
        {item.subtitulo && (
          <span className="block truncate text-xs text-[var(--color-tinta-suave)]">{item.subtitulo}</span>
        )}
      </span>
      <span
        className="tabular flex-none font-semibold"
        style={{ color: item.tipo === 'entrada' ? 'var(--color-positivo)' : 'var(--color-alerta)' }}
      >
        {item.tipo === 'saida' ? '− ' : ''}
        {formatMoney(item.valor)}
      </span>
      {item.href && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-tinta-suave)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-none"
          aria-hidden
        >
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )}
    </div>
  );

  // `href` aqui é montado a partir de 3 rotas diferentes (turno, abastecimento
  // etc.) — uma <a> comum em vez de <Link>, porque o roteamento tipado do
  // Next não consegue verificar um href dinâmico vindo de dado, só literal.
  return item.href ? (
    <a href={item.href} className="block">
      {conteudo}
    </a>
  ) : (
    conteudo
  );
}
