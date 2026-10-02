import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatHoras, formatMoney, medias } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarPainelMeta } from '@/lib/meta/dados';
import { can } from '@/lib/entitlements';
import { AutoAtualizar } from '../formularios';
import { COR_FAROL } from '../ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Modo Corrida — Sobrou' };

/**
 * Modo Corrida: só o que se lê em poucos segundos com o carro parado.
 * Números enormes, nada de menu, atualiza sozinho a cada 30 s.
 */
export default async function ModoCorridaPage() {
  const ctx = await carregarContexto();
  if (!(await can('goals'))) redirect('/app/meta');
  const p = await carregarPainelMeta(ctx);
  const d = p.metaHoje;
  const m = medias({ ...p.totaisHoje, diasTrabalhados: 1 });

  const blocos = [
    {
      valor: d ? (d.atingida ? `+${formatMoney(d.excedente)}` : formatMoney(d.restante)) : '—',
      rotulo: d ? (d.atingida ? 'Meta batida ✅ — acima do planejado' : 'Falta para hoje') : 'Sem meta para hoje',
      cor: d?.atingida ? 'var(--color-positivo)' : undefined,
      grande: true,
    },
    { valor: formatMoney(m.porHora), rotulo: 'Média atual (R$/h)', cor: p.farois.porHora ? COR_FAROL[p.farois.porHora].cor : undefined },
    { valor: formatMoney(m.porKm), rotulo: 'Eficiência (R$/km)', cor: p.farois.porKm ? COR_FAROL[p.farois.porKm].cor : undefined },
    {
      valor: d && !d.atingida ? formatHoras(d.horasRestantes) : '—',
      rotulo: p.previsaoHorario ? `Tempo restante · bate às ${p.previsaoHorario}` : 'Tempo estimado restante',
    },
  ];

  return (
    <div className="flex min-h-[80dvh] flex-col">
      <AutoAtualizar segundos={30} />
      <div className="mb-4 flex items-center justify-between">
        <Link href="/app/meta" className="text-sm text-[var(--color-marca)]">
          ← Sair do Modo Corrida
        </Link>
        <Link href="/app/turno/ganho" className="rounded-full bg-[var(--color-marca)] px-4 py-2 text-sm font-bold text-white">
          + Ganho
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {blocos.map((b) => (
          <div key={b.rotulo} className={`cartao flex flex-col justify-center px-5 ${b.grande ? 'flex-[1.6] py-8' : 'flex-1 py-5'}`}>
            <p
              className={`tabular font-extrabold leading-none ${b.grande ? 'text-6xl' : 'text-4xl'}`}
              style={b.cor ? { color: b.cor } : undefined}
            >
              {b.valor}
            </p>
            <p className="mt-2 text-base text-[var(--color-tinta-suave)]">{b.rotulo}</p>
          </div>
        ))}
      </div>

      {d && (
        <div className="mt-3 h-4 overflow-hidden rounded-full" style={{ background: 'var(--color-papel-suave)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(d.percentual ?? 0, 100)}%`,
              background: d.atingida ? 'var(--color-positivo)' : 'var(--color-marca)',
            }}
          />
        </div>
      )}
      {p.alertas[0] && <p className="mt-3 text-center text-sm text-[var(--color-tinta-suave)]">{p.alertas[0].texto}</p>}
    </div>
  );
}
