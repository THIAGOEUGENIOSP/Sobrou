import Link from 'next/link';
import { redirect } from 'next/navigation';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarResumoDia } from '@/lib/meta/dados';
import { can } from '@/lib/entitlements';
import { dataLocal } from '@/lib/numeros';
import { Voltar } from '../ui';
import { BlocoResumo } from './bloco';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Resumo do dia — Sobrou' };

export default async function ResumoDoDiaPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  if (!(await can('goals'))) redirect('/app/meta');

  const hoje = dataLocal(new Date(), ctx.timezone);
  const data = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) && sp.data <= hoje ? sp.data : hoje;
  const r = await carregarResumoDia(ctx, data);

  return (
    <>
      <Voltar href="/app/meta">Meta do Mês</Voltar>
      <h1 className="mb-4 mt-4 text-xl font-bold">{data === hoje ? 'Resumo de hoje' : 'Resumo do dia'}</h1>
      {r.totais.faturamento === 0 && r.totais.horas === 0 ? (
        <p className="text-sm text-[var(--color-tinta-suave)]">Nada registrado neste dia.</p>
      ) : (
        <BlocoResumo r={r} />
      )}
      <Link
        href="/app/meta"
        className="mt-2 flex min-h-12 items-center justify-center rounded-full bg-[var(--color-marca)] font-semibold text-white"
      >
        Ver a Meta do Mês
      </Link>
    </>
  );
}
