import Link from 'next/link';
import {
  avaliarCoberturaReserva,
  custoCobertoPelaReservaPorKm,
  custoTotalPorKm,
  formatMoney,
  formatRate,
  safeDiv,
} from '@kmlegal/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Reservas — KM Legal' };

const ORIGEM: Record<string, string> = {
  shift: 'Fechamento do turno',
  maintenance: 'Manutenção',
  manual: 'Ajuste manual',
  ajuste: 'Correção',
};

export default async function ReservasPage() {
  const ctx = await carregarContexto();
  const supabase = await createClient();

  const { data: saldos } = await supabase
    .from('v_reserve_balances')
    .select('reserve_kind, saldo, total_creditado, total_gasto');

  const { data: movimentos } = await supabase
    .from('reserve_movements')
    .select('id, reserve_kind, direction, valor, source, occurred_on, description')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const veiculo = saldos?.find((s) => s.reserve_kind === 'veiculo');
  const emergencia = saldos?.find((s) => s.reserve_kind === 'emergencia');

  // A reserva do carro está no tamanho certo? Comparação da seção 10.
  const doze = new Date();
  doze.setMonth(doze.getMonth() - 12);

  const { data: manutencoes12m } = await supabase
    .from('maintenances')
    .select('valor')
    .gte('performed_at', doze.toISOString().slice(0, 10));

  const { data: turnos12m } = await supabase
    .from('shifts')
    .select('snap_km, snap_reserva_veiculo')
    .eq('status', 'fechado')
    .gte('work_date', doze.toISOString().slice(0, 10));

  const km12m = (turnos12m ?? []).reduce((a, t) => a + Number(t.snap_km ?? 0), 0);
  const reservado12m = (turnos12m ?? []).reduce(
    (a, t) => a + Number(t.snap_reserva_veiculo ?? 0),
    0,
  );
  const gasto12m = (manutencoes12m ?? []).reduce((a, m) => a + Number(m.valor), 0);

  const breakdown = ctx.veiculo
    ? custoTotalPorKm({
        combustivelPorKm: null,
        basis: {
          valorCompra: ctx.veiculo.valor_compra,
          valorResidualEstimado: ctx.veiculo.valor_residual_est,
          vidaUtilKm: ctx.veiculo.vida_util_km,
          seguroMensal: ctx.veiculo.seguro_mensal,
          custosFixosMensais: ctx.veiculo.custos_fixos_mensais,
          kmMedioMensal: ctx.veiculo.km_medio_mensal,
          manutencaoKmEstimada: ctx.veiculo.manutencao_km_estimada,
        },
        totalManutencoes12m: gasto12m,
        kmRodados12m: km12m,
      })
    : null;

  const cobertura = avaliarCoberturaReserva(
    safeDiv(reservado12m, km12m, 4),
    breakdown ? custoCobertoPelaReservaPorKm(breakdown) : null,
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Reservas</h1>
        <Link
          href="/app/manutencoes/nova"
          className="shrink-0 rounded-full bg-[var(--color-marca)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          + Manutenção
        </Link>
      </div>

      <section className="mb-6 grid gap-3">
        <Saldo
          titulo="Reserva do carro"
          saldo={Number(veiculo?.saldo ?? 0)}
          reservado={Number(veiculo?.total_creditado ?? 0)}
          gasto={Number(veiculo?.total_gasto ?? 0)}
        />
        <Saldo
          titulo="Reserva de emergência"
          saldo={Number(emergencia?.saldo ?? 0)}
          reservado={Number(emergencia?.total_creditado ?? 0)}
          gasto={Number(emergencia?.total_gasto ?? 0)}
        />
      </section>

      {cobertura.status !== 'sem_dados' && (
        <section
          className="mb-8 rounded-[var(--radius-cartao)] border p-4"
          style={{
            borderColor:
              cobertura.status === 'insuficiente'
                ? 'var(--color-alerta)'
                : 'var(--color-borda)',
          }}
        >
          <h2 className="mb-1 font-semibold">A reserva do carro está no tamanho certo?</h2>
          <p className="text-sm text-[var(--color-tinta-suave)]">
            Você reserva {formatRate(cobertura.reservadoPorKm, 'km')} e o desgaste real
            (manutenção e depreciação) custa {formatRate(cobertura.custoRealPorKm, 'km')}.{' '}
            {cobertura.status === 'insuficiente' ? (
              <strong className="text-[var(--color-alerta)]">
                O percentual está curto: considere aumentar a fatia do veículo.
              </strong>
            ) : cobertura.status === 'justa' ? (
              'Está justa: cobre, mas sem folga para imprevisto grande.'
            ) : (
              'Está cobrindo com folga.'
            )}
          </p>
        </section>
      )}

      <h2 className="mb-3 font-semibold">Extrato</h2>
      {(movimentos ?? []).length === 0 ? (
        <div className="rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nenhum movimento ainda.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Cada turno fechado credita a sua fatia aqui automaticamente.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          {(movimentos ?? []).map((m) => {
            const credito = m.direction === 'credito';
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {m.description || ORIGEM[m.source] || 'Movimento'}
                  </span>
                  <span className="block text-sm text-[var(--color-tinta-suave)]">
                    {m.reserve_kind === 'veiculo' ? 'Carro' : 'Emergência'} ·{' '}
                    {new Date(`${m.occurred_on}T12:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                </span>
                <span
                  className="tabular shrink-0 font-semibold"
                  style={{ color: credito ? 'var(--color-positivo)' : 'var(--color-alerta)' }}
                >
                  {credito ? '+' : '−'} {formatMoney(Number(m.valor))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-[var(--color-tinta-suave)]">
        Crédito é dinheiro separado; débito é dinheiro que saiu. O saldo é a diferença — nunca o
        total reservado.
      </p>
    </>
  );
}

function Saldo({
  titulo,
  saldo,
  reservado,
  gasto,
}: {
  titulo: string;
  saldo: number;
  reservado: number;
  gasto: number;
}) {
  return (
    <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4">
      <p className="text-sm text-[var(--color-tinta-suave)]">{titulo}</p>
      <p className="tabular mt-1 text-2xl font-bold">{formatMoney(saldo)}</p>
      <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
        {formatMoney(reservado)} guardados · {formatMoney(gasto)} já gastos
      </p>
    </div>
  );
}
