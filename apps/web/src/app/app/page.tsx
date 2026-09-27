import Link from 'next/link';
import {
  ALLOCATION_PADRAO,
  formatConsumo,
  formatHoras,
  formatKm,
  formatMoney,
  formatPercent,
  type ChavePeriodo,
} from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarPeriodo } from '@/lib/relatorios/dados';
import { resolverPeriodoDoUsuario } from '@/lib/relatorios/periodo';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Painel — Sobrou' };

/** As 4 abas do painel — um subconjunto de `PERIODOS`, na ordem do painel de bordo. */
const ABAS_PAINEL: Array<{ chave: ChavePeriodo; rotulo: string }> = [
  { chave: 'hoje', rotulo: 'Diário' },
  { chave: 'semana', rotulo: 'Semanal' },
  { chave: 'mes', rotulo: 'Mensal' },
  { chave: 'ano', rotulo: 'Anual' },
];

function divisao(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await createClient();

  const chave = (ABAS_PAINEL.some((a) => a.chave === sp.periodo) ? sp.periodo : 'hoje') as ChavePeriodo;
  const periodo = resolverPeriodoDoUsuario(chave, ctx.timezone);
  const atual = await carregarPeriodo(periodo.de, periodo.ate);
  const t = atual.totais;
  const semDados = t.turnos === 0 && t.gastoCombustivelReal === 0;

  const { data: turnoAberto } = await supabase
    .from('shifts')
    .select('id, started_at')
    .eq('status', 'aberto')
    .maybeSingle();

  const { data: saldos } = await supabase
    .from('v_reserve_balances')
    .select('reserve_kind, saldo, total_creditado, total_gasto');

  const { data: percentuais } = await supabase
    .from('allocation_configs')
    .select('pct_disponivel, pct_emergencia, pct_veiculo')
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  const saldoVeiculo = saldos?.find((s) => s.reserve_kind === 'veiculo');
  const saldoEmergencia = saldos?.find((s) => s.reserve_kind === 'emergencia');
  const pct = percentuais ?? {
    pct_disponivel: ALLOCATION_PADRAO.pctDisponivel,
    pct_emergencia: ALLOCATION_PADRAO.pctEmergencia,
    pct_veiculo: ALLOCATION_PADRAO.pctVeiculo,
  };

  const despesas = t.custoCombustivel + t.outrasDespesas;
  const margemPct = t.faturamento > 0 ? (t.resultadoOperacional / t.faturamento) * 100 : null;
  const qtd = t.qtdCorridas;

  const linhas = [
    {
      titulo: 'Faturamento',
      porViagem: qtd ? divisao(t.faturamento, qtd) : null,
      porHora: t.faturamentoPorHora,
      porKm: t.faturamentoPorKm,
    },
    {
      titulo: 'Despesas',
      porViagem: qtd ? divisao(despesas, qtd) : null,
      porHora: divisao(despesas, t.horas),
      porKm: divisao(despesas, t.km),
    },
    {
      titulo: 'Lucro',
      porViagem: qtd ? divisao(t.resultadoOperacional, qtd) : null,
      porHora: t.resultadoPorHora,
      porKm: t.resultadoPorKm,
    },
  ];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Painel</h1>
      <p className="mb-5 text-sm text-[var(--color-tinta-suave)]">{periodo.rotulo}</p>

      {turnoAberto ? (
        <Link
          href="/app/turno"
          className="cartao mb-5 flex items-center justify-between gap-3 p-4"
          style={{ borderColor: 'var(--color-marca)', background: 'var(--color-marca-suave)' }}
        >
          <span>
            <span className="block font-semibold" style={{ color: 'var(--color-marca-forte)' }}>
              Turno em andamento
            </span>
            <span className="block text-sm text-[var(--color-tinta-suave)]">
              Desde{' '}
              {new Date(turnoAberto.started_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              . Toque para finalizar.
            </span>
          </span>
          <span aria-hidden style={{ color: 'var(--color-marca-forte)' }}>
            →
          </span>
        </Link>
      ) : (
        <Link
          href="/app/turno"
          className="mb-5 block w-full rounded-full px-6 py-4 text-center font-semibold text-white"
          style={{ background: 'var(--color-marca)', boxShadow: 'var(--sombra-cartao)' }}
        >
          Iniciar turno
        </Link>
      )}

      {/* Abas de período: mesma ideia de `PERIODOS`, um subconjunto fixo de 4, sem
          precisar de JS no cliente — é só navegação por link. */}
      <div
        className="mb-6 grid grid-cols-4 gap-1 rounded-full p-1"
        style={{ background: 'var(--color-papel-suave)' }}
      >
        {ABAS_PAINEL.map((a) => (
          <Link
            key={a.chave}
            href={`/app?periodo=${a.chave}`}
            className="rounded-full py-2 text-center text-sm font-medium"
            style={
              a.chave === chave
                ? { background: 'var(--color-marca)', color: '#fff' }
                : { color: 'var(--color-tinta-suave)' }
            }
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {semDados ? (
        <div className="mb-8 rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nada registrado {periodo.rotulo.toLowerCase()}.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Assim que você fechar um turno neste período, o faturamento, as despesas e o lucro
            aparecem aqui.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-3">
            <div
              className="rounded-[var(--radius-cartao)] p-4 text-center"
              style={{ background: 'var(--color-positivo)' }}
            >
              <p className="text-sm font-medium text-black/70">Faturamento</p>
              <p className="tabular mt-1 text-3xl font-extrabold text-black">
                {formatMoney(t.faturamento)}
              </p>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-2 gap-3">
            <div
              className="rounded-[var(--radius-cartao)] p-4 text-center"
              style={{ background: 'var(--color-alerta)' }}
            >
              <p className="text-sm font-medium text-white/85">Despesas</p>
              <p className="tabular mt-1 text-xl font-bold text-white">{formatMoney(despesas)}</p>
            </div>
            <div
              className="rounded-[var(--radius-cartao)] p-4 text-center"
              style={{ background: 'var(--color-margem)' }}
            >
              <p className="text-sm font-medium text-white/85">Lucro</p>
              <p className="tabular mt-1 text-xl font-bold text-white">
                {formatMoney(t.resultadoOperacional)}
              </p>
              {margemPct !== null && (
                <p className="tabular mt-0.5 text-xs text-white/80">
                  {formatPercent(margemPct, 0)} de margem
                </p>
              )}
            </div>
          </section>

          <section className="mb-6 grid grid-cols-3 gap-2">
            <CelulaResumo titulo="Viagens" valor={qtd !== null ? String(qtd) : '—'} />
            <CelulaResumo titulo="Horas" valor={formatHoras(t.horas)} />
            <CelulaResumo titulo="KM rodados" valor={formatKm(t.km, 0)} />
          </section>

          <section className="mb-8">
            <div className="overflow-hidden rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-borda)] text-left text-xs text-[var(--color-tinta-suave)]">
                    <th className="px-3 py-2 font-medium"> </th>
                    <th className="px-3 py-2 text-right font-medium">Por viagem</th>
                    <th className="px-3 py-2 text-right font-medium">Por hora</th>
                    <th className="px-3 py-2 text-right font-medium">Por km</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-borda)]">
                  {linhas.map((l) => (
                    <tr key={l.titulo}>
                      <td className="px-3 py-2 font-medium">{l.titulo}</td>
                      <td className="tabular px-3 py-2 text-right">{formatMoney(l.porViagem)}</td>
                      <td className="tabular px-3 py-2 text-right">{formatMoney(l.porHora)}</td>
                      <td className="tabular px-3 py-2 text-right">{formatMoney(l.porKm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {atual.porPlataforma.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-semibold">Faturamento por aplicativo</h2>
              <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
                {atual.porPlataforma.map((p) => (
                  <li key={p.nome} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: p.cor ?? 'var(--color-tinta-fraca)' }}
                        aria-hidden
                      />
                      <span className="truncate font-medium">{p.nome}</span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{formatMoney(p.valor)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Link
        href="/app/consultor"
        className="cartao mb-8 flex items-center gap-3 p-4"
        style={{ background: 'var(--color-aviso-suave)', borderColor: 'transparent' }}
      >
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[0.65rem]"
          style={{ background: 'var(--color-papel-elevado)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-aviso)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3V16h5.8v-.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" />
          </svg>
        </div>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Seu consultor</span>
          <span className="block text-xs text-[var(--color-tinta-suave)]">
            Leituras do seu histórico: custo, melhor dia, projeção do mês.
          </span>
        </span>
        <span aria-hidden className="flex-none text-[var(--color-aviso)]">→</span>
      </Link>

      <section aria-label="Reservas" className="mb-8">
        <h2 className="mb-3 font-semibold">Reservas</h2>
        <div className="grid grid-cols-2 gap-3">
          <CartaoReserva
            titulo="Reserva do carro"
            valor={formatMoney(saldoVeiculo?.saldo ?? 0)}
            detalhe={`${formatMoney(saldoVeiculo?.total_creditado ?? 0)} guardados · ${formatMoney(
              saldoVeiculo?.total_gasto ?? 0,
            )} já gastos`}
          />
          <CartaoReserva
            titulo="Emergência"
            valor={formatMoney(saldoEmergencia?.saldo ?? 0)}
            detalhe={`${formatMoney(saldoEmergencia?.total_creditado ?? 0)} guardados · ${formatMoney(
              saldoEmergencia?.total_gasto ?? 0,
            )} já gastos`}
          />
        </div>
      </section>

      <section aria-label="Configuração" className="mb-8">
        <h2 className="mb-3 font-semibold">Seu setup</h2>
        <dl className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Veículo</dt>
            <dd className="font-medium">{ctx.veiculo?.nickname ?? '—'}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Consumo de referência</dt>
            <dd className="tabular font-medium">{formatConsumo(ctx.veiculo?.consumo_ref_etanol)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Hodômetro</dt>
            <dd className="tabular font-medium">{formatKm(ctx.veiculo?.odometro_atual, 0)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Divisão do resultado</dt>
            <dd className="tabular font-medium">
              {pct.pct_disponivel}/{pct.pct_emergencia}/{pct.pct_veiculo}
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-sm text-[var(--color-tinta-suave)]">
        <Link href="/app/relatorios" className="text-[var(--color-marca)]">
          Ver relatório completo do período
        </Link>{' '}
        — plataforma detalhada, evolução dia a dia e comparação com o período anterior.
      </p>

      {atual.recortadoPeloPlano && (
        <p className="mt-4 text-xs text-[var(--color-tinta-suave)]">
          Seu plano mostra o histórico a partir de{' '}
          {new Date(`${atual.deEfetivo}T12:00:00`).toLocaleDateString('pt-BR')}; o período pedido
          começava antes disso.
        </p>
      )}
    </>
  );
}

function CelulaResumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div
      className="rounded-[var(--radius-cartao)] p-3 text-center"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <p className="text-xs text-[var(--color-tinta-suave)]">{titulo}</p>
      <p className="tabular mt-0.5 font-bold">{valor}</p>
    </div>
  );
}

function CartaoReserva({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <p className="text-sm text-[var(--color-tinta-suave)]">{titulo}</p>
      <p className="tabular mt-1 text-2xl font-bold">{valor}</p>
      <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">{detalhe}</p>
    </div>
  );
}
