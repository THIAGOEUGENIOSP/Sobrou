import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  custoCombustivelEstimado,
  formatConsumo,
  formatKm,
  formatMoney,
  formatRate,
  safeDiv,
} from '@sobrou/finance';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { BotaoAjustes } from '@/components/cabecalho';
import { Confirmacao } from '@/components/confirmacao';
import { cancelarTurno, excluirTransacao, pausarTurno, retomarTurno } from '@/lib/turnos/actions';
import { FormularioIniciarTurno } from './iniciar';
import { Cronometro } from './cronometro';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Turno — Sobrou' };

const TEXTO_CONFIRMACAO: Record<string, (valor: string) => string> = {
  ganho: (v) => `Ganho de R$ ${v} adicionado — já somado ao Faturamento, logo abaixo.`,
  despesa: (v) => `Despesa de R$ ${v} lançada — já descontada do Resultado estimado, logo abaixo.`,
};

export default async function TurnoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; valor?: string }>;
}) {
  const sp = await searchParams;
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

  const custoPorKm = combustivelEstimado !== null ? safeDiv(combustivelEstimado, kmInformado, 2) : null;

  const pausado = Boolean(turno.paused_at);
  const confirmacao = sp.ok && sp.valor ? TEXTO_CONFIRMACAO[sp.ok]?.(sp.valor) : null;

  return (
    <>
      {confirmacao && <Confirmacao fecharHref="/app/turno">{confirmacao}</Confirmacao>}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="h-[18px] w-[18px] flex-none rounded-full"
            style={{
              background: pausado ? '#f4b942' : '#31D8A4',
              boxShadow: pausado ? '0 0 10px 1px rgba(244,185,66,0.55)' : '0 0 10px 1px rgba(49,216,164,0.55)',
            }}
          />
          <span>
            <span className="block text-[18px] font-semibold leading-tight" style={{ color: '#F5F6FA' }}>
              Turno em andamento
            </span>
            <span className="block text-[13px] font-medium leading-tight" style={{ color: '#66C9B1' }}>
              {pausado ? 'Pausado' : 'Rodando agora'}
            </span>
          </span>
        </div>
        <BotaoAjustes />
      </div>
      <p className="mb-2 text-xs text-[var(--color-tinta-suave)]">
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

      {/* Cores exatas do modelo (não são os tokens globais — pedido específico
          desta tela, pra bater 1:1 com a referência do Thiago). */}
      <section
        className="mt-3 p-5"
        style={{
          background: 'linear-gradient(160deg, #102C29 0%, #0C2726 100%)',
          borderRadius: '22px',
          border: '1px solid rgba(102, 201, 177, 0.14)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium" style={{ color: '#A5ACB7' }}>
            Faturamento
          </p>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#31D8A4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 19 19 5M9 5h10v10" />
          </svg>
        </div>
        <p className="tabular mt-1 text-[35px] font-bold leading-tight" style={{ color: '#31D8A4' }}>
          {formatMoney(faturamento)}
        </p>
        <p
          className="mt-3 flex items-center justify-around border-t pt-3 text-[14px] font-semibold"
          style={{ borderColor: 'rgba(102, 201, 177, 0.14)', color: '#F5F6FA' }}
        >
          <span>{totalCorridas > 0 ? `${totalCorridas} corridas` : `${listaGanhos.length} lançamentos`}</span>
          {temKm && <span>{formatKm(kmInformado, 0)}</span>}
          {faturamentoPorHora !== null && <span>{formatRate(faturamentoPorHora, 'h')}</span>}
        </p>
      </section>

      <section
        className="mt-3 p-5"
        style={{
          background: 'linear-gradient(160deg, #182535 0%, #151E2C 100%)',
          borderRadius: '21px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium" style={{ color: '#9FB0AE' }}>
            Resultado estimado
          </h2>
          <span
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs"
            style={{ border: '1px solid #A5ACB7', color: '#A5ACB7' }}
            title="Faturamento − despesas do turno − combustível estimado"
            aria-hidden
          >
            i
          </span>
        </div>
        <p className="tabular mt-1 text-[36px] font-bold leading-tight" style={{ color: '#31D8A4' }}>
          {formatMoney(resultadoEstimado)}
        </p>
        <p className="mt-1 text-[13px]" style={{ color: '#A5ACB7' }}>
          Após custos e reservas
        </p>

        {combustivelEstimado !== null ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ChipEstimativa
              valor={formatConsumo(parametros.consumo)}
              rotulo="Consumo"
              corIcone="#31D8A4"
              icone={<path d="M12 3s6 6.5 6 10.5a6 6 0 1 1-12 0C6 9.5 12 3 12 3Z" />}
            />
            <ChipEstimativa
              valor={formatRate(custoPorKm, 'km')}
              rotulo="Custo por km"
              corIcone="#F5F6FA"
              icone={<path d="M4 16l4-8h2l-1.5 5H13l4-8h2l-5 11H12l1-3H9l-1 3H6l-2-3Z" />}
            />
          </div>
        ) : (
          <p className="mt-3 text-xs" style={{ color: '#A5ACB7' }}>
            Combustível ainda não entra na conta: nenhuma corrida informou km rodado.
          </p>
        )}
      </section>

      <div className="mt-5 flex gap-[10px]">
        <form action={pausado ? retomarTurno : pausarTurno} className="basis-[39%]">
          <input type="hidden" name="id" value={turno.id} />
          <button
            type="submit"
            className="flex h-[64px] w-full items-center justify-center gap-2 whitespace-nowrap px-2 text-center text-[15px] font-medium"
            style={{
              background: 'linear-gradient(160deg, #102C29 0%, #0C2726 100%)',
              border: '1px solid rgba(102, 201, 177, 0.35)',
              borderRadius: '17px',
              color: '#66C9B1',
            }}
          >
            {pausado ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="flex-none">
                <path d="M8 5v14l11-7Z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="flex-none">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            )}
            {pausado ? 'Retomar' : 'Pausar'}
          </button>
        </form>
        <Link
          href="/app/turno/fechar"
          className="flex h-[64px] basis-[59%] items-center justify-center gap-2 whitespace-nowrap px-2 text-center text-[15px] font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, #FF5744 0%, #FF4039 100%)',
            borderRadius: '17px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="flex-none">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          Encerrar turno
        </Link>
      </div>

      <p className="mt-4 text-center text-sm text-[var(--color-tinta-suave)]">
        <Link href="/app/turno/ganho" className="font-medium text-[var(--color-marca)]">
          + Adicionar ganho
        </Link>
        {' · '}
        <Link href="/app/abastecimentos/novo" className="font-medium text-[var(--color-marca)]">
          Abastecimento
        </Link>
        {' · '}
        <Link href="/app/lancamentos/novo" className="font-medium text-[var(--color-marca)]">
          Despesa
        </Link>
      </p>

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

function ChipEstimativa({
  valor,
  rotulo,
  icone,
  corIcone,
}: {
  valor: string;
  rotulo: string;
  icone: React.ReactNode;
  corIcone: string;
}) {
  return (
    <div
      className="flex h-[65px] items-center gap-2.5 px-3"
      style={{ background: '#102027', borderRadius: '17px' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={corIcone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden>
        {icone}
      </svg>
      <span className="min-w-0">
        <span className="tabular block text-[16px] font-bold" style={{ color: '#F5F6FA' }}>
          {valor}
        </span>
        <span className="block text-[13px]" style={{ color: '#A5ACB7' }}>
          {rotulo}
        </span>
      </span>
    </div>
  );
}
