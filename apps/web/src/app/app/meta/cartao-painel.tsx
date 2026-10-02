import Link from 'next/link';
import { formatHoras, formatMoney, formatPercent } from '@sobrou/finance';
import type { ContextoUsuario } from '@/lib/dados/contexto';
import { carregarPainelMeta } from '@/lib/meta/dados';
import { Barra } from './ui';

/** "META DE HOJE" no topo do painel inicial: quanto falta, em um toque leva à Meta do Mês. */
export async function CartaoMetaHojePainel({ ctx }: { ctx: ContextoUsuario }) {
  const p = await carregarPainelMeta(ctx);
  const d = p.metaHoje;

  if (!d) {
    if (p.alvo !== null) return null; // dia de folga: não ocupa espaço no painel
    return (
      <Link href="/app/meta" className="cartao mb-5 flex items-center justify-between gap-3 p-4">
        <span>
          <span className="block font-semibold">Defina sua meta do mês</span>
          <span className="block text-sm text-[var(--color-tinta-suave)]">E veja quanto falta a cada corrida.</span>
        </span>
        <span aria-hidden className="text-[var(--color-marca)]">→</span>
      </Link>
    );
  }

  return (
    <Link href="/app/meta" className="cartao mb-5 block p-5">
      <span className="mb-1 flex items-center justify-between text-xs font-bold tracking-wider text-[var(--color-tinta-suave)]">
        <span>META DE HOJE · {formatMoney(d.meta)}</span>
        <span className="tabular">{formatPercent(d.percentual, 0)}</span>
      </span>
      {d.atingida ? (
        <span className="block text-2xl font-extrabold text-[var(--color-positivo)]">
          META BATIDA ✅ <span className="tabular text-base">+{formatMoney(d.excedente)}</span>
        </span>
      ) : (
        <span className="tabular block text-4xl font-extrabold">
          {formatMoney(d.restante)}
          <span className="ml-2 text-sm font-medium text-[var(--color-tinta-suave)]">faltam</span>
        </span>
      )}
      <span className="mb-2 mt-1 block text-sm text-[var(--color-tinta-suave)]">
        {formatMoney(d.faturado)} faturado
        {!d.atingida && d.horasRestantes !== null && ` · ≈ ${formatHoras(d.horasRestantes)} no ritmo de hoje`}
        {p.previsaoHorario && ` · ${p.previsaoHorario}`}
      </span>
      <Barra percentual={d.percentual} atingida={d.atingida} rotulo="Progresso da meta de hoje" />
      {p.plano && (
        <span className="tabular mt-2 block text-xs text-[var(--color-tinta-suave)]">
          Mês: {formatMoney(p.plano.progresso.realizado)} de {formatMoney(p.plano.progresso.alvo)} · faltam{' '}
          {formatMoney(p.plano.progresso.restante)}
        </span>
      )}
    </Link>
  );
}
