import 'server-only';

import {
  avaliarCoberturaReserva,
  custoCobertoPelaReservaPorKm,
  custoTotalPorKm,
  safeDiv,
} from '@sobrou/finance';
import { createServiceClient } from '@/lib/supabase/server';
import type { PayloadNotificacao } from './push';

/**
 * Avisos ativos, computados fora de uma sessão de navegador (job diário).
 *
 * As duas contas aqui são as MESMAS de "Manutenções" (consultor) e
 * "Reservas": nada nesta função inventa um número novo, ela só decide se o
 * que a tela já mostra é grave o bastante para interromper o motorista com
 * uma notificação em vez de esperar ele abrir o app.
 *
 * Roda com o cliente de serviço (ignora RLS) porque não há sessão de
 * usuário num job — por isso todo filtro aqui é explícito por `userId`.
 */

const KM_AVISO_MANUTENCAO = 800;

function dozeMesesAtras(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d.toISOString().slice(0, 10);
}

export async function gerarAvisosParaUsuario(userId: string): Promise<PayloadNotificacao[]> {
  const supabase = createServiceClient();
  const desde = dozeMesesAtras();

  const [{ data: veiculos }, { data: settings }, { data: manutencoes }, { data: turnos12m }, { data: saldos }] =
    await Promise.all([
      supabase
        .from('vehicles')
        .select(
          'id, odometro_atual, valor_compra, valor_residual_est, vida_util_km, seguro_mensal, custos_fixos_mensais, km_medio_mensal, manutencao_km_estimada',
        )
        .eq('user_id', userId)
        .is('archived_at', null),
      supabase.from('user_settings').select('default_vehicle_id').eq('user_id', userId).maybeSingle(),
      supabase
        .from('maintenances')
        .select('vehicle_id, valor, next_km, performed_at')
        .eq('user_id', userId)
        .order('performed_at', { ascending: false }),
      supabase
        .from('shifts')
        .select('snap_km, snap_reserva_veiculo')
        .eq('user_id', userId)
        .eq('status', 'fechado')
        .gte('work_date', desde),
      supabase
        .from('v_reserve_balances')
        .select('reserve_kind, saldo')
        .eq('user_id', userId),
    ]);

  const avisos: PayloadNotificacao[] = [];

  const veiculo =
    (veiculos ?? []).find((v) => v.id === settings?.default_vehicle_id) ?? veiculos?.[0] ?? null;

  // 1) Manutenção vencendo ou vencida — mesma regra do consultor.
  if (veiculo?.odometro_atual) {
    const ultima = (manutencoes ?? []).find((m) => m.vehicle_id === veiculo.id);
    if (ultima?.next_km) {
      const faltam = Number(ultima.next_km) - Number(veiculo.odometro_atual);
      if (faltam <= KM_AVISO_MANUTENCAO) {
        avisos.push({
          tag: 'manutencao',
          titulo: faltam <= 0 ? 'Manutenção já venceu pelo hodômetro' : 'Manutenção chegando',
          corpo:
            faltam <= 0
              ? `O hodômetro já passou dos ${Math.round(Number(ultima.next_km)).toLocaleString('pt-BR')} km previstos para a próxima manutenção.`
              : `Faltam cerca de ${Math.round(faltam).toLocaleString('pt-BR')} km para a próxima manutenção prevista.`,
          url: '/app/consultor',
        });
      }
    }
  }

  // 2) Reserva do carro insuficiente — mesma regra da tela "Reservas".
  if (veiculo) {
    const km12m = (turnos12m ?? []).reduce((a, t) => a + Number(t.snap_km ?? 0), 0);
    const reservado12m = (turnos12m ?? []).reduce(
      (a, t) => a + Number(t.snap_reserva_veiculo ?? 0),
      0,
    );
    const gasto12m = (manutencoes ?? [])
      .filter((m) => m.vehicle_id === veiculo.id && m.performed_at >= desde)
      .reduce((a, m) => a + Number(m.valor), 0);

    const breakdown = custoTotalPorKm({
      combustivelPorKm: null,
      basis: {
        valorCompra: veiculo.valor_compra,
        valorResidualEstimado: veiculo.valor_residual_est,
        vidaUtilKm: veiculo.vida_util_km,
        seguroMensal: veiculo.seguro_mensal,
        custosFixosMensais: veiculo.custos_fixos_mensais,
        kmMedioMensal: veiculo.km_medio_mensal,
        manutencaoKmEstimada: veiculo.manutencao_km_estimada,
      },
      totalManutencoes12m: gasto12m,
      kmRodados12m: km12m,
    });

    const cobertura = avaliarCoberturaReserva(
      safeDiv(reservado12m, km12m, 4),
      custoCobertoPelaReservaPorKm(breakdown),
    );

    if (cobertura.status === 'insuficiente') {
      avisos.push({
        tag: 'reserva-insuficiente',
        titulo: 'Reserva do carro está curta',
        corpo:
          'O que você está guardando por km está abaixo do desgaste real do veículo (manutenção e depreciação). Considere aumentar a fatia do veículo na divisão do resultado.',
        url: '/app/reservas',
      });
    }
  }

  // 3) Saldo negativo em qualquer reserva — sinal de que já saiu mais do que entrou.
  for (const s of saldos ?? []) {
    if (Number(s.saldo) < 0) {
      avisos.push({
        tag: `reserva-negativa-${s.reserve_kind}`,
        titulo:
          s.reserve_kind === 'veiculo'
            ? 'Reserva do carro ficou negativa'
            : 'Reserva de emergência ficou negativa',
        corpo: 'O que já foi gasto passou o que foi guardado. Vale olhar o extrato da reserva.',
        url: '/app/reservas',
      });
    }
  }

  return avisos;
}
