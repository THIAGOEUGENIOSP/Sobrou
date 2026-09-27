import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatConsumo, formatMoney, formatRate } from '@sobrou/finance';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { cancelarTurno, excluirTransacao } from '@/lib/turnos/actions';
import { FormularioIniciarTurno } from './iniciar';
import { Cronometro } from './cronometro';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Turno — Sobrou' };

export default async function TurnoPage() {
  const ctx = await carregarContexto();
  if (!ctx.veiculo) redirect('/onboarding');

  const supabase = await createClient();
  const { data: turno } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', 'aberto')
    .maybeSingle();

  const parametros = parametrosDoTurno(ctx);

  if (!turno) {
    return (
      <>
        <h1 className="mb-1 text-xl font-bold">Iniciar turno</h1>
        <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
          Dois toques e você está rodando. O resto se preenche sozinho.
        </p>

        <FormularioIniciarTurno
          veiculos={ctx.veiculos.map((v) => ({ id: v.id, nickname: v.nickname }))}
          vehicleId={ctx.veiculo.id}
          odometroSugerido={
            ctx.veiculo.odometro_atual ? String(ctx.veiculo.odometro_atual) : ''
          }
        />

        <section
          className="mt-8 rounded-[var(--radius-cartao)] p-4"
          style={{ background: 'var(--color-papel-suave)' }}
        >
          <h2 className="mb-2 font-semibold">O que o cálculo vai usar</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-tinta-suave)]">Consumo</dt>
              <dd className="tabular font-medium">
                {formatConsumo(parametros.consumo)}
                <span className="ml-1 font-normal text-[var(--color-tinta-suave)]">
                  {parametros.origemConsumo === 'medido'
                    ? '(medido)'
                    : parametros.origemConsumo === 'cadastro'
                      ? '(do cadastro)'
                      : '(estimativa)'}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-tinta-suave)]">Preço do combustível</dt>
              <dd className="tabular font-medium">
                {parametros.origemPreco === 'historico' ? formatRate(parametros.preco, 'L') : '—'}
              </dd>
            </div>
          </dl>
          {parametros.origemPreco === 'sem_historico' && (
            <p className="mt-2 text-xs text-[var(--color-alerta)]">
              Sem abastecimento registrado, o custo de combustível do turno sai zerado.{' '}
              <Link href="/app/abastecimentos/novo" className="underline">
                Registre um abastecimento
              </Link>{' '}
              antes de fechar o dia.
            </p>
          )}
        </section>
      </>
    );
  }

  const { data: despesas } = await supabase
    .from('transactions')
    .select('id, valor, description, category_id, occurred_at')
    .eq('shift_id', turno.id)
    .eq('kind', 'despesa')
    .order('occurred_at', { ascending: false });

  const { data: categorias } = await supabase
    .from('categories')
    .select('id, name')
    .is('archived_at', null);

  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.id, c.name]));
  const totalDespesas = (despesas ?? []).reduce((a, d) => a + Number(d.valor), 0);

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Turno em andamento</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Começou às{' '}
        {new Date(turno.started_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: ctx.timezone,
        })}
        , com {Number(turno.odo_inicial).toLocaleString('pt-BR')} km no hodômetro.
      </p>

      <Cronometro inicio={turno.started_at} />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          href="/app/abastecimentos/novo"
          className="rounded-[var(--radius-cartao)] p-4 text-center font-medium"
          style={{ background: 'var(--color-info-suave)', color: 'var(--color-info)' }}
        >
          + Abastecimento
        </Link>
        <Link
          href="/app/lancamentos/novo"
          className="rounded-[var(--radius-cartao)] p-4 text-center font-medium"
          style={{ background: 'var(--color-alerta-suave)', color: 'var(--color-alerta)' }}
        >
          + Despesa
        </Link>
      </div>

      {(despesas ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-baseline justify-between font-semibold">
            <span>Despesas deste turno</span>
            <span className="tabular text-sm font-normal text-[var(--color-tinta-suave)]">
              {formatMoney(totalDespesas)}
            </span>
          </h2>
          <ul className="space-y-2">
            {(despesas ?? []).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-cartao)] p-3"
                style={{ background: 'var(--color-papel-elevado)' }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {nomeCategoria.get(d.category_id) ?? 'Despesa'}
                  </span>
                  {d.description && (
                    <span className="block truncate text-sm text-[var(--color-tinta-suave)]">
                      {d.description}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tabular font-semibold" style={{ color: 'var(--color-alerta)' }}>
                    − {formatMoney(Number(d.valor))}
                  </span>
                  <form action={excluirTransacao}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      aria-label="Remover despesa"
                      className="px-1 text-[var(--color-tinta-suave)]"
                    >
                      ✕
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/app/turno/fechar"
        className="mt-8 block w-full rounded-full bg-[var(--color-marca)] px-6 py-4 text-center font-semibold text-white"
      >
        Finalizar turno
      </Link>

      <form action={cancelarTurno} className="mt-3">
        <input type="hidden" name="id" value={turno.id} />
        <button
          type="submit"
          className="w-full py-3 text-center text-sm text-[var(--color-tinta-suave)]"
        >
          Cancelar turno sem registrar
        </button>
      </form>
    </>
  );
}
