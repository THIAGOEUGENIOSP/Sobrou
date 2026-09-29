import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatKm, formatMoney, safeDiv } from '@sobrou/finance';
import { createClient } from '@/lib/supabase/server';
import { carregarContexto } from '@/lib/dados/contexto';
import { BotaoSino } from '@/components/cabecalho';
import { excluirGanho } from '@/lib/turnos/actions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Detalhes da corrida — Sobrou' };

/**
 * Uma corrida, os campos que ela realmente tem.
 *
 * `shift_revenues` guarda km, duração e nota do passageiro como opcionais —
 * a maioria das corridas lançadas sem "Mais detalhes" não tem nenhum dos
 * três. Por isso cada linha só aparece quando o valor existe: nada aqui é
 * estimado ou inventado para preencher a tela.
 */
export default async function DetalheCorridaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await carregarContexto();

  const { data: corrida } = await supabase
    .from('shift_revenues')
    .select('id, shift_id, category_id, valor, qtd_corridas, occurred_at, km, duracao_min, nota_passageiro, notes')
    .eq('id', id)
    .maybeSingle();

  if (!corrida) notFound();

  const [{ data: categoria }, { data: turno }] = await Promise.all([
    supabase.from('categories').select('name').eq('id', corrida.category_id).maybeSingle(),
    supabase.from('shifts').select('status').eq('id', corrida.shift_id).maybeSingle(),
  ]);

  const podeExcluir = turno?.status === 'aberto';
  // Editar não tem essa trava: igual `atualizarTransacao`, dá pra corrigir um
  // lançamento mesmo depois que o turno dele já fechou — bem mais comum, já
  // que a maioria das revisões acontece depois, olhando o dia inteiro em
  // Transações, não durante o turno ainda aberto.
  const podeEditar = true;

  const km = corrida.km !== null ? Number(corrida.km) : null;
  const valorPorKm = km !== null ? safeDiv(Number(corrida.valor), km, 2) : null;
  const horas = corrida.duracao_min !== null ? Number(corrida.duracao_min) / 60 : null;
  const valorPorHora = horas !== null ? safeDiv(Number(corrida.valor), horas, 2) : null;
  const horario = new Date(corrida.occurred_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ctx.timezone,
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/app/turno" className="text-sm text-[var(--color-marca)]">
          ← Turno
        </Link>
        <BotaoSino />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <span
          className="flex h-11 w-11 flex-none items-center justify-center rounded-[0.75rem] text-sm font-bold text-white"
          style={{ background: 'var(--color-tinta-fraca)' }}
          aria-hidden
        >
          {(categoria?.name ?? 'Corrida').slice(0, 2).toUpperCase()}
        </span>
        <span>
          <span className="block font-bold">{categoria?.name ?? 'Corrida'}</span>
          <span className="block text-sm text-[var(--color-tinta-suave)]">
            {new Date(corrida.occurred_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              timeZone: ctx.timezone,
            })}{' '}
            · {horario}
          </span>
        </span>
      </div>

      <section className="mb-6">
        <p className="tabular text-4xl font-extrabold">{formatMoney(Number(corrida.valor))}</p>
      </section>

      <dl className="space-y-1.5 text-sm">
        {km !== null && <Linha rotulo="Distância total" valor={formatKm(km)} />}
        {corrida.duracao_min !== null && (
          <Linha rotulo="Tempo" valor={`${Number(corrida.duracao_min)} min`} />
        )}
        {valorPorKm !== null && <Linha rotulo="Valor por km" valor={formatMoney(valorPorKm)} />}
        {valorPorHora !== null && <Linha rotulo="Valor por hora" valor={formatMoney(valorPorHora)} />}
        <Linha rotulo="Horário" valor={horario} />
        {corrida.nota_passageiro !== null && (
          <Linha rotulo="Avaliação do passageiro" valor={`★ ${Number(corrida.nota_passageiro).toFixed(2)}`} />
        )}
        {corrida.qtd_corridas !== null && corrida.qtd_corridas !== 1 && (
          <Linha rotulo="Quantidade de corridas" valor={String(corrida.qtd_corridas)} />
        )}
      </dl>

      {corrida.notes && (
        <p className="mt-4 rounded-[var(--radius-cartao)] p-4 text-sm" style={{ background: 'var(--color-papel-suave)' }}>
          {corrida.notes}
        </p>
      )}

      {km === null && corrida.duracao_min === null && corrida.nota_passageiro === null && !corrida.notes && (
        <p className="mt-4 text-sm text-[var(--color-tinta-suave)]">
          Essa corrida foi lançada sem km, duração ou nota — só o valor mesmo.
        </p>
      )}

      {(podeEditar || podeExcluir) && (
        <div className="mt-8 flex flex-col gap-1">
          {podeEditar && (
            <Link
              href={`/app/turno/corrida/${corrida.id}/editar`}
              className="w-full py-3 text-center text-sm font-medium"
              style={{ color: 'var(--color-marca)' }}
            >
              Editar corrida
            </Link>
          )}
          {podeExcluir && (
            <form action={excluirGanho}>
              <input type="hidden" name="id" value={corrida.id} />
              <button
                type="submit"
                className="w-full py-3 text-center text-sm"
                style={{ color: 'var(--color-alerta)' }}
              >
                Remover esta corrida
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-[var(--radius-cartao)] px-4 py-3" style={{ background: 'var(--color-papel-elevado)' }}>
      <dt className="text-[var(--color-tinta-suave)]">{rotulo}</dt>
      <dd className="tabular font-medium">{valor}</dd>
    </div>
  );
}
