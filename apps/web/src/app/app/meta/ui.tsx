import Link from 'next/link';
import type { Route } from 'next';
import type { Farol } from '@sobrou/finance';

/** Peças visuais da Meta do Mês — mesmos tokens e cartões do resto do app. */

export const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const NOMES_DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function nomeDoMes(iso: string): string {
  return MESES[Number(iso.slice(5, 7)) - 1] ?? '';
}

/** "sáb., 03/10" */
export function rotuloData(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${NOMES_DIAS_CURTOS[d.getUTCDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export const COR_FAROL: Record<Farol, { cor: string; fundo: string; rotulo: string; emoji: string }> = {
  verde: { cor: 'var(--color-positivo)', fundo: 'var(--color-positivo-suave)', rotulo: 'Bom desempenho', emoji: '🟢' },
  amarelo: { cor: 'var(--color-aviso)', fundo: 'var(--color-aviso-suave)', rotulo: 'Atenção', emoji: '🟡' },
  vermelho: { cor: 'var(--color-alerta)', fundo: 'var(--color-alerta-suave)', rotulo: 'Abaixo da meta', emoji: '🔴' },
};

export function PontoFarol({ farol }: { farol: Farol | null }) {
  if (!farol) return null;
  return (
    <span
      role="img"
      aria-label={COR_FAROL[farol].rotulo}
      title={COR_FAROL[farol].rotulo}
      className="inline-block h-2.5 w-2.5 flex-none rounded-full"
      style={{ background: COR_FAROL[farol].cor }}
    />
  );
}

export function Barra({ percentual, atingida, rotulo }: { percentual: number | null; atingida: boolean; rotulo: string }) {
  const pct = Math.max(0, Math.min(percentual ?? 0, 100));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-3 overflow-hidden rounded-full"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: atingida ? 'var(--color-positivo)' : 'var(--color-marca)' }}
      />
    </div>
  );
}

export function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`cartao p-5 ${className}`}>{children}</section>;
}

export function Indicador({
  rotulo,
  valor,
  farol,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  farol?: Farol | null;
  detalhe?: string;
}) {
  return (
    <div className="cartao p-4">
      <p className="flex items-center gap-1.5 text-xs text-[var(--color-tinta-suave)]">
        {farol !== undefined && <PontoFarol farol={farol} />}
        {rotulo}
      </p>
      <p className="tabular mt-1 text-xl font-bold">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-[var(--color-tinta-suave)]">{detalhe}</p>}
    </div>
  );
}

export function Linha({ rotulo, valor, forte }: { rotulo: string; valor: React.ReactNode; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-[var(--color-tinta-suave)]">{rotulo}</dt>
      <dd className={`tabular text-right ${forte ? 'font-bold' : 'font-medium'}`}>{valor}</dd>
    </div>
  );
}

export function Voltar({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-[var(--color-marca)]">
      ← {children}
    </Link>
  );
}
