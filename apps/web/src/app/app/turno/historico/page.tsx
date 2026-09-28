import Link from 'next/link';
import { formatMoney } from '@sobrou/finance';
import { createClient, requireUser } from '@/lib/supabase/server';
import { Confirmacao } from '@/components/confirmacao';
import { ExcluirTurno } from './excluir-turno';
import { ExcluirPeriodo } from './excluir-periodo';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Histórico de turnos — Sobrou' };

function rotuloDia(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  const dataFmt = d.toLocaleDateString('pt-BR');
  const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${dataFmt} · ${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}`;
}

/**
 * Lista de turnos já fechados, com exclusão — de um em um ou por período.
 * Antes disso só existia mexendo direto no banco; agora é uma tela do app.
 * Não tem edição aqui de propósito: mudar km, consumo ou percentuais de um
 * dia já fechado reabriria uma conta que foi congelada no fechamento — mais
 * seguro excluir e lançar de novo do que "corrigir" um turno antigo.
 */
export default async function HistoricoTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; qtd?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: turnos } = await supabase
    .from('shifts')
    .select('id, work_date, snap_disponivel, snap_faturamento')
    .eq('user_id', user.id)
    .eq('status', 'fechado')
    .order('work_date', { ascending: false })
    .limit(200);

  return (
    <>
      <Link href="/app" className="text-sm text-[var(--color-marca)]">
        ← Meu dia
      </Link>

      <h1 className="mt-4 mb-1 text-xl font-bold">Histórico de turnos</h1>
      <p className="mb-5 text-sm text-[var(--color-tinta-suave)]">
        Turnos já fechados. Aqui só dá para excluir — para corrigir algo, exclua e feche o turno de
        novo.
      </p>

      {sp.ok === 'excluido' && (
        <Confirmacao fecharHref="/app/turno/historico">Turno excluído.</Confirmacao>
      )}
      {sp.ok === 'periodo' && (
        <Confirmacao fecharHref="/app/turno/historico">
          {sp.qtd ?? 'Os'} turno{sp.qtd === '1' ? '' : 's'} do período excluído{sp.qtd === '1' ? '' : 's'}.
        </Confirmacao>
      )}

      {!turnos || turnos.length === 0 ? (
        <div
          className="mb-6 rounded-[var(--radius-cartao)] p-6 text-center"
          style={{ background: 'var(--color-papel-suave)' }}
        >
          <p className="font-medium">Nenhum turno fechado ainda.</p>
        </div>
      ) : (
        <ul className="mb-6 space-y-2">
          {turnos.map((t) => {
            const disponivel = Number(t.snap_disponivel ?? 0);
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-[var(--radius-cartao)] p-3"
                style={{ background: 'var(--color-papel-elevado)' }}
              >
                <Link href={`/app/turno/${t.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{rotuloDia(t.work_date)}</span>
                  <span
                    className="tabular block text-sm font-semibold"
                    style={{ color: disponivel < 0 ? 'var(--color-alerta)' : 'var(--color-positivo)' }}
                  >
                    {formatMoney(disponivel)}
                  </span>
                </Link>
                <ExcluirTurno id={t.id} rotulo={rotuloDia(t.work_date)} />
              </li>
            );
          })}
        </ul>
      )}

      <ExcluirPeriodo />
    </>
  );
}
