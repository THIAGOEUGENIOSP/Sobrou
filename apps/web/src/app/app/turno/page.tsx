import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  custoCombustivelEstimado,
  formatConsumo,
  formatMoney,
  formatRate,
} from '@sobrou/finance';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { cancelarTurno, excluirTransacao, pausarTurno, retomarTurno } from '@/lib/turnos/actions';
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

  const [{ data: despesas }, { data: categorias }, { data: ganhos }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, valor, description, category_id, occurred_at')
      .eq('shift_id', turno.id)
      .eq('kind', 'despesa')
      .order('occurred_at', { ascending: false }),
    supabase.from('categories').select('id, name').is('archived_at', null),
    supabase
      .from('shift_revenues')
      .select('id, category_id, valor, qtd_corridas, occurred_at, km')
      .eq('shift_id', turno.id)
      .order('occurred_at', { ascending: false }),
  ]);

  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.id, c.name]));
  const totalDespesas = (despesas ?? []).reduce((a, d) => a + Number(d.valor), 0);

  const listaGanhos = ganhos ?? [];
  const faturamento = listaGanhos.reduce((a, g) => a + Number(g.valor), 0);
  const totalCorridas = listaGanhos.reduce((a, g) => a + (g.qtd_corridas ?? 0), 0);

  // Km só entra na estimativa quando pelo menos uma corrida informou km —
  // nunca chutado a partir do faturamento ou do histórico.
  const kmInformado = listaGanhos.reduce((a, g) => a + (g.km !== null ? Number(g.km) : 0), 0);
  const temKm = listaGanhos.some((g) => g.km !== null);
  const combustivelEstimado = temKm
    ? custoCombustivelEstimado(kmInformado, parametros.consumo, parametros.preco)
    : null;

  const resultadoEstimado =
    faturamento - totalDespesas - (combustivelEstimado ?? 0);

  const segundosDecorridos = Math.max(
    0,
    (Date.now() - new Date(turno.started_at).getTime()) / 1000 -
      Number(turno.paused_seconds ?? 0) -
      (turno.paused_at ? (Date.now() - new Date(turno.paused_at).getTime()) / 1000 : 0),
  );
  const faturamentoPorHora =
    segundosDecorridos > 60 ? faturamento / (segundosDecorridos / 3600) : null;

  const pausado = Boolean(turno.paused_at);

  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: pausado ? 'var(--color-aviso)' : 'var(--color-positivo)' }}
        />
        <h1 className="text-xl font-bold">{pausado ? 'Turno pausado' : 'Rodando agora'}</h1>
      </div>
      <p className="mb-4 text-sm text-[var(--color-tinta-suave)]">
        Começou às{' '}
        {new Date(turno.started_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: ctx.timezone,
        })}
        , com {Number(turno.odo_inicial).toLocaleString('pt-BR')} km no hodômetro.
      </p>

      <Cronometro
        inicio={turno.started_at}
        pausedSeconds={Number(turno.paused_seconds ?? 0)}
        pausedAt={turno.paused_at}
      />

      <section
        className="mt-5 rounded-[var(--radius-cartao)] p-5"
        style={{ background: 'var(--color-positivo)' }}
      >
        <p className="text-sm font-medium text-black/70">Faturamento até agora</p>
        <p className="tabular mt-1 text-4xl font-extrabold text-black">
          {formatMoney(faturamento)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-sm text-black/70">
          <span>
            {totalCorridas > 0 ? `${totalCorridas} corridas` : `${listaGanhos.length} lançamentos`}
          </span>
          <span>
            {faturamentoPorHora !== null
              ? `${formatRate(faturamentoPorHora, 'h')}`
              : 'R$/h em instantes'}
          </span>
        </div>
      </section>

      <section
        className="mt-3 rounded-[var(--radius-cartao)] p-5"
        style={{ background: 'var(--color-papel-suave)' }}
      >
        <h2 className="mb-2 text-sm font-medium text-[var(--color-tinta-suave)]">
          Resultado estimado
        </h2>
        <p className="tabular text-2xl font-bold">{formatMoney(resultadoEstimado)}</p>
        <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
          Faturamento − despesas do turno
          {combustivelEstimado !== null
            ? ` − combustível estimado (${formatMoney(combustivelEstimado)}, pelo km informado nas corridas)`
            : ' — combustível ainda não entra na conta: nenhuma corrida informou km rodado'}
          .
        </p>
      </section>

      <Link
        href="/app/turno/ganho"
        className="mt-5 block w-full rounded-full bg-[var(--color-marca)] px-6 py-4 text-center font-semibold text-white"
      >
        + Adicionar ganho
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-3">
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

      <div className="mt-3 grid grid-cols-2 gap-3">
        <form action={pausado ? retomarTurno : pausarTurno}>
          <input type="hidden" name="id" value={turno.id} />
          <button
            type="submit"
            className="w-full rounded-full border px-6 py-3 text-center font-medium"
            style={{ borderColor: 'var(--color-borda)' }}
          >
            {pausado ? 'Retomar' : 'Pausar'}
          </button>
        </form>
        <Link
          href="/app/turno/fechar"
          className="rounded-full px-6 py-3 text-center font-semibold text-white"
          style={{ background: 'var(--color-tinta)' }}
        >
          Encerrar turno
        </Link>
      </div>

      {listaGanhos.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-baseline justify-between font-semibold">
            <span>Registro rápido</span>
            <span className="tabular text-sm font-normal text-[var(--color-tinta-suave)]">
              {formatMoney(faturamento)}
            </span>
          </h2>
          <ul className="space-y-2">
            {listaGanhos.slice(0, 3).map((g) => (
              <li key={g.id}>
                <Link
                  href={`/app/turno/corrida/${g.id}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-cartao)] p-3"
                  style={{ background: 'var(--color-papel-elevado)' }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {nomeCategoria.get(g.category_id) ?? 'Corrida'}
                    </span>
                    <span className="block truncate text-sm text-[var(--color-tinta-suave)]">
                      {new Date(g.occurred_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: ctx.timezone,
                      })}
                      {g.qtd_corridas ? ` · ${g.qtd_corridas} corridas` : ''}
                    </span>
                  </span>
                  <span
                    className="tabular shrink-0 font-semibold"
                    style={{ color: 'var(--color-positivo)' }}
                  >
                    + {formatMoney(Number(g.valor))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      <form action={cancelarTurno} className="mt-8">
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
