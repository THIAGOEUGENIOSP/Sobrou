import Link from 'next/link';
import { Suspense } from 'react';
import {
  custoTotalPorKm,
  formatMoney,
  formatRate,
  type RideRules,
} from '@kmlegal/finance';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { can } from '@/lib/entitlements';
import { Analisador } from './analisador';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Vale a pena? — KM Legal' };

export default async function CorridaPage() {
  const podeUsar = await can('ride_analyzer');

  if (!podeUsar) {
    return (
      <>
        <h1 className="mb-6 text-xl font-bold">Vale a pena?</h1>
        <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">O analisador de corridas faz parte do plano Premium.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Ele compara o que a corrida paga com o que ela custa no seu carro, incluindo o
            deslocamento até o passageiro.
          </p>
        </div>
      </>
    );
  }

  const ctx = await carregarContexto();
  const supabase = await createClient();

  const { data: regras } = await supabase
    .from('ride_rules')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  const { data: recentes } = await supabase
    .from('ride_evaluations')
    .select('id, valor, km_busca, km_viagem, rs_km, veredito, aceita, evaluated_at')
    .order('evaluated_at', { ascending: false })
    .limit(5);

  // O custo por km sai do combustível medido mais o desgaste do veículo.
  const parametros = parametrosDoTurno(ctx);
  const combustivelPorKm =
    parametros.preco > 0 && parametros.consumo > 0 ? parametros.preco / parametros.consumo : null;

  const doze = new Date();
  doze.setMonth(doze.getMonth() - 12);

  const { data: manutencoes } = await supabase
    .from('maintenances')
    .select('valor')
    .gte('performed_at', doze.toISOString().slice(0, 10));

  const { data: turnos } = await supabase
    .from('shifts')
    .select('snap_km')
    .eq('status', 'fechado')
    .gte('work_date', doze.toISOString().slice(0, 10));

  const breakdown = ctx.veiculo
    ? custoTotalPorKm({
        combustivelPorKm,
        basis: {
          valorCompra: ctx.veiculo.valor_compra,
          valorResidualEstimado: ctx.veiculo.valor_residual_est,
          vidaUtilKm: ctx.veiculo.vida_util_km,
          seguroMensal: ctx.veiculo.seguro_mensal,
          custosFixosMensais: ctx.veiculo.custos_fixos_mensais,
          kmMedioMensal: ctx.veiculo.km_medio_mensal,
          manutencaoKmEstimada: ctx.veiculo.manutencao_km_estimada,
        },
        totalManutencoes12m: (manutencoes ?? []).reduce((a, m) => a + Number(m.valor), 0),
        kmRodados12m: (turnos ?? []).reduce((a, t) => a + Number(t.snap_km ?? 0), 0),
      })
    : null;

  const usarTotal = (ctx.settings?.ride_cost_basis ?? 'total') === 'total';
  const custoPorKm = usarTotal ? (breakdown?.total ?? combustivelPorKm) : combustivelPorKm;

  const regrasAtuais: RideRules = regras
    ? {
        valorMin: regras.valor_min,
        rsKmMin: regras.rs_km_min,
        rsHoraMin: regras.rs_hora_min,
        distMaxBusca: regras.dist_max_busca,
        notaMin: regras.nota_min,
        margemMin: regras.margem_min,
      }
    : {};

  const semRegras = Object.values(regrasAtuais).every((v) => v == null);

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold">Vale a pena?</h1>
        <Link href="/app/corrida/regras" className="shrink-0 text-sm text-[var(--color-marca)]">
          Minhas regras
        </Link>
      </div>

      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Custo considerado: {formatRate(custoPorKm, 'km')}{' '}
        {usarTotal ? '(combustível + desgaste)' : '(só combustível)'}.
      </p>

      <Suspense fallback={null}>
        <Analisador regras={regrasAtuais} custoPorKm={custoPorKm} semRegras={semRegras} />
      </Suspense>

      {(recentes ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-semibold">Últimas avaliações</h2>
          <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
            {(recentes ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{formatMoney(Number(r.valor))}</span>
                  <span className="ml-2 text-[var(--color-tinta-suave)]">
                    {Number(r.km_busca) + Number(r.km_viagem)} km ·{' '}
                    {formatRate(Number(r.rs_km), 'km')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      color:
                        r.veredito === 'aceitar'
                          ? 'var(--color-positivo)'
                          : 'var(--color-alerta)',
                    }}
                  >
                    {r.veredito === 'aceitar' ? 'valia' : 'não valia'}
                  </span>
                  {r.aceita !== null && (
                    <span className="text-xs text-[var(--color-tinta-suave)]">
                      {r.aceita ? 'aceitou' : 'recusou'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
