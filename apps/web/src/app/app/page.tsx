import Link from 'next/link';
import {
  ALLOCATION_PADRAO,
  agregarPeriodo,
  custoTotalPorKm,
  formatConsumo,
  formatKm,
  formatMoney,
  formatRate,
  type ShiftSnapshot,
} from '@kmlegal/finance';
import { createClient, requireUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Meu dia — KM Legal' };

function Cartao({
  titulo,
  valor,
  detalhe,
  destaque,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className="rounded-[var(--radius-cartao)] border p-4"
      style={{
        borderColor: destaque ? 'var(--color-marca)' : 'var(--color-borda)',
        background: destaque ? 'transparent' : 'var(--color-papel-suave)',
      }}
    >
      <p className="text-sm text-[var(--color-tinta-suave)]">{titulo}</p>
      <p
        className="tabular mt-1 text-2xl font-bold"
        style={destaque ? { color: 'var(--color-marca)' } : undefined}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">{detalhe}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  // Consultas sequenciais de propósito: agrupá-las em Promise.all colapsa a
  // inferência de tipos do PostgREST e devolve `never` em vez das linhas.
  const { data: turnosHoje } = await supabase
    .from('shifts')
    .select(
      'id, work_date, status, snap_km, snap_horas, snap_litros, snap_faturamento, snap_custo_combustivel, snap_outras_despesas, snap_resultado_op, snap_reserva_veiculo, snap_reserva_emerg, snap_disponivel',
    )
    .eq('work_date', hoje)
    .eq('status', 'fechado');

  const { data: turnoAberto } = await supabase
    .from('shifts')
    .select('id, started_at, odo_inicial')
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

  const { data: veiculo } = await supabase
    .from('vehicles')
    .select('*')
    .is('archived_at', null)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('user_settings')
    .select('dashboard_cards')
    .eq('user_id', user.id)
    .maybeSingle();

  // Os snapshots são a fonte: os números da tela são os mesmos que foram
  // congelados no fechamento de cada turno.
  const snapshots: ShiftSnapshot[] = (turnosHoje ?? []).map((t) => ({
    workDate: t.work_date,
    km: t.snap_km ?? 0,
    horas: t.snap_horas ?? 0,
    litros: t.snap_litros ?? 0,
    faturamento: t.snap_faturamento ?? 0,
    custoCombustivel: t.snap_custo_combustivel ?? 0,
    outrasDespesas: t.snap_outras_despesas ?? 0,
    resultadoOperacional: t.snap_resultado_op ?? 0,
    reservaVeiculo: t.snap_reserva_veiculo ?? 0,
    reservaEmergencia: t.snap_reserva_emerg ?? 0,
    disponivel: t.snap_disponivel ?? 0,
  }));

  const dia = agregarPeriodo(snapshots);
  const semDados = snapshots.length === 0;

  const saldoVeiculo = saldos?.find((s) => s.reserve_kind === 'veiculo');
  const saldoEmergencia = saldos?.find((s) => s.reserve_kind === 'emergencia');
  const pct = percentuais ?? {
    pct_disponivel: ALLOCATION_PADRAO.pctDisponivel,
    pct_emergencia: ALLOCATION_PADRAO.pctEmergencia,
    pct_veiculo: ALLOCATION_PADRAO.pctVeiculo,
  };

  // Custo total por km: combustível é só a ponta (seção 10).
  const custoTotal = veiculo
    ? custoTotalPorKm({
        combustivelPorKm: dia.custoCombustivelPorKm,
        basis: {
          valorCompra: veiculo.valor_compra,
          valorResidualEstimado: veiculo.valor_residual_est,
          vidaUtilKm: veiculo.vida_util_km,
          seguroMensal: veiculo.seguro_mensal,
          custosFixosMensais: veiculo.custos_fixos_mensais,
          kmMedioMensal: veiculo.km_medio_mensal,
          manutencaoKmEstimada: veiculo.manutencao_km_estimada,
        },
      })
    : null;

  // Quais cards aparecem é escolha do usuário (seção 14).
  const CARDS: Record<string, { titulo: string; valor: string; detalhe?: string; destaque?: boolean }> = {
    fat_hoje: { titulo: 'Faturamento', valor: formatMoney(dia.faturamento) },
    disponivel: { titulo: 'Disponível', valor: formatMoney(dia.disponivel), destaque: true },
    km: { titulo: 'KM rodados', valor: formatKm(dia.km) },
    rs_km: { titulo: 'R$/km', valor: formatRate(dia.faturamentoPorKm, 'km') },
    rs_hora: { titulo: 'R$/hora', valor: formatRate(dia.faturamentoPorHora, 'h') },
    custo_km: {
      titulo: 'Custo total/km',
      valor: formatRate(custoTotal?.total ?? null, 'km'),
      detalhe:
        custoTotal && custoTotal.faltando.length > 0
          ? 'Faltam dados do veículo para a conta completa'
          : 'Combustível, manutenção, depreciação e fixos',
    },
    combustivel: {
      titulo: 'Combustível',
      valor: formatMoney(dia.custoCombustivel),
      detalhe: formatRate(dia.custoCombustivelPorKm, 'km'),
    },
    reserva_veic: {
      titulo: 'Reservado hoje (carro)',
      valor: formatMoney(dia.reservaVeiculo),
    },
    reserva_emerg: {
      titulo: 'Reservado hoje (emergência)',
      valor: formatMoney(dia.reservaEmergencia),
    },
  };

  const escolhidos = Array.isArray(settings?.dashboard_cards)
    ? (settings.dashboard_cards as string[])
    : [];
  const cardsEscolhidos =
    escolhidos.length > 0
      ? escolhidos.filter((c) => c in CARDS)
      : ['fat_hoje', 'disponivel', 'km', 'combustivel', 'rs_km', 'rs_hora'];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Meu dia</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        {new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })}
      </p>

      {turnoAberto ? (
        <Link
          href="/app/turno"
          className="mb-6 flex items-center justify-between gap-3 rounded-[var(--radius-cartao)] border border-[var(--color-marca)] p-4"
        >
          <span>
            <span className="block font-semibold text-[var(--color-marca)]">
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
          <span aria-hidden className="text-[var(--color-marca)]">
            →
          </span>
        </Link>
      ) : (
        <Link
          href="/app/turno"
          className="mb-6 block w-full rounded-full bg-[var(--color-marca)] px-6 py-4 text-center font-semibold text-white"
        >
          Iniciar turno
        </Link>
      )}

      <section aria-label="Ações rápidas" className="mb-8 grid grid-cols-2 gap-3">
        <Link
          href="/app/abastecimentos/novo"
          className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4 text-center font-medium"
        >
          + Abastecimento
        </Link>
        <Link
          href="/app/lancamentos/novo"
          className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4 text-center font-medium"
        >
          + Despesa
        </Link>
      </section>

      {semDados ? (
        <div className="mb-8 rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nenhum turno fechado hoje.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Assim que você fechar o primeiro turno, aparecem aqui o faturamento, o custo do
            combustível e quanto sobrou de verdade.
          </p>
        </div>
      ) : (
        <section aria-label="Resumo de hoje" className="mb-8 grid grid-cols-2 gap-3">
          {cardsEscolhidos.map((chave) => {
            const card = CARDS[chave];
            return card ? <Cartao key={chave} {...card} /> : null;
          })}
        </section>
      )}

      <section aria-label="Reservas" className="mb-8">
        <h2 className="mb-3 font-semibold">Reservas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Cartao
            titulo="Reserva do carro"
            valor={formatMoney(saldoVeiculo?.saldo ?? 0)}
            detalhe={`${formatMoney(saldoVeiculo?.total_creditado ?? 0)} guardados · ${formatMoney(
              saldoVeiculo?.total_gasto ?? 0,
            )} já gastos`}
          />
          <Cartao
            titulo="Emergência"
            valor={formatMoney(saldoEmergencia?.saldo ?? 0)}
            detalhe={`${formatMoney(saldoEmergencia?.total_creditado ?? 0)} guardados · ${formatMoney(
              saldoEmergencia?.total_gasto ?? 0,
            )} já gastos`}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
          Dinheiro reservado não é dinheiro gasto. O saldo só cai quando você registra uma
          manutenção paga com a reserva.
        </p>
      </section>

      <section aria-label="Configuração" className="mb-8">
        <h2 className="mb-3 font-semibold">Seu setup</h2>
        <dl className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Veículo</dt>
            <dd className="font-medium">{veiculo?.nickname ?? '—'}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Consumo de referência</dt>
            <dd className="tabular font-medium">{formatConsumo(veiculo?.consumo_ref_etanol)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Hodômetro</dt>
            <dd className="tabular font-medium">{formatKm(veiculo?.odometro_atual, 0)}</dd>
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
        Conta de {user.email}.{' '}
        <Link href="/app/conta" className="text-[var(--color-marca)]">
          Exportar meus dados ou excluir a conta
        </Link>
        .
      </p>
    </>
  );
}
