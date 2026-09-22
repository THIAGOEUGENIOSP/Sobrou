import 'server-only';

import {
  mesAtual,
  progressoMeta,
  ritmoNecessario,
  semanaAtual,
  type ProgressoMeta,
} from '@sobrou/finance';
import { carregarPeriodo } from '@/lib/relatorios/dados';
import { createClient } from '@/lib/supabase/server';
import { dataLocal } from '@/lib/numeros';
import type { Enums, Tables } from '@/lib/supabase/database.types';

/**
 * Progresso das metas (seção 15).
 *
 * Cada tipo de meta é medido contra a janela que faz sentido para ele: a meta
 * diária olha hoje, a semanal olha de segunda até agora, a mensal olha o mês
 * corrente. As de reserva olham o saldo acumulado, que não tem janela.
 */

export type TipoMeta = Enums<'goal_kind'>;

export const ROTULOS_META: Record<TipoMeta, string> = {
  fat_diaria: 'Faturamento por dia',
  fat_semanal: 'Faturamento por semana',
  fat_mensal: 'Faturamento no mês',
  liquido_mensal: 'Disponível no mês',
  rs_km_min: 'R$ por km',
  rs_h_min: 'R$ por hora',
  reserva_emerg: 'Reserva de emergência',
  reserva_veic: 'Reserva do carro',
};

/** Metas de taxa (R$/km, R$/h) não somam: são médias que se compara ao alvo. */
const METAS_DE_TAXA: TipoMeta[] = ['rs_km_min', 'rs_h_min'];

export interface MetaComProgresso {
  meta: Tables<'goals'>;
  rotulo: string;
  progresso: ProgressoMeta;
  /** Quanto por dia falta para bater, quando a janela tem prazo. */
  ritmoDiario: number | null;
  diasRestantes: number | null;
  /** Como o valor é exibido: dinheiro, taxa por km, taxa por hora. */
  formato: 'moeda' | 'rs_km' | 'rs_hora';
  janela: string;
}

export async function carregarMetas(timezone: string): Promise<MetaComProgresso[]> {
  const supabase = await createClient();

  const { data: metas } = await supabase
    .from('goals')
    .select('*')
    .eq('is_active', true)
    .order('kind');

  if (!metas || metas.length === 0) return [];

  const hoje = dataLocal(new Date(), timezone);
  const semana = semanaAtual(hoje);
  const mes = mesAtual(hoje);

  // Carrega só as janelas que alguma meta ativa realmente usa.
  const tipos = new Set(metas.map((m) => m.kind));
  const precisaDia = tipos.has('fat_diaria');
  const precisaSemana = tipos.has('fat_semanal');
  const precisaMes =
    tipos.has('fat_mensal') ||
    tipos.has('liquido_mensal') ||
    tipos.has('rs_km_min') ||
    tipos.has('rs_h_min');

  const [doDia, daSemana, doMes] = await Promise.all([
    precisaDia ? carregarPeriodo(hoje, hoje) : Promise.resolve(null),
    precisaSemana ? carregarPeriodo(semana.de, semana.ate) : Promise.resolve(null),
    precisaMes ? carregarPeriodo(mes.de, mes.ate) : Promise.resolve(null),
  ]);

  const { data: saldos } = await supabase
    .from('v_reserve_balances')
    .select('reserve_kind, saldo');

  const saldo = (kind: string) =>
    Number(saldos?.find((s) => s.reserve_kind === kind)?.saldo ?? 0);

  return metas.map((meta) => {
    const alvo = Number(meta.target_value);
    let realizado = 0;
    let diasRestantes: number | null = null;
    let formato: MetaComProgresso['formato'] = 'moeda';
    let janela = 'acumulado';

    switch (meta.kind) {
      case 'fat_diaria':
        realizado = doDia?.totais.faturamento ?? 0;
        janela = 'hoje';
        break;
      case 'fat_semanal':
        realizado = daSemana?.totais.faturamento ?? 0;
        diasRestantes = semana.diasRestantes;
        janela = 'esta semana';
        break;
      case 'fat_mensal':
        realizado = doMes?.totais.faturamento ?? 0;
        diasRestantes = mes.diasRestantes;
        janela = 'este mês';
        break;
      case 'liquido_mensal':
        realizado = doMes?.totais.disponivel ?? 0;
        diasRestantes = mes.diasRestantes;
        janela = 'este mês';
        break;
      case 'rs_km_min':
        realizado = doMes?.totais.faturamentoPorKm ?? 0;
        formato = 'rs_km';
        janela = 'média do mês';
        break;
      case 'rs_h_min':
        realizado = doMes?.totais.faturamentoPorHora ?? 0;
        formato = 'rs_hora';
        janela = 'média do mês';
        break;
      case 'reserva_emerg':
        realizado = saldo('emergencia');
        break;
      case 'reserva_veic':
        realizado = saldo('veiculo');
        break;
    }

    const progresso = progressoMeta(realizado, alvo);

    return {
      meta,
      rotulo: ROTULOS_META[meta.kind],
      progresso,
      // Ritmo só faz sentido para meta que acumula. Uma média de R$/km não se
      // alcança "fazendo X por dia", então aqui fica null de propósito.
      ritmoDiario:
        diasRestantes !== null && !METAS_DE_TAXA.includes(meta.kind)
          ? ritmoNecessario(realizado, alvo, diasRestantes)
          : null,
      diasRestantes,
      formato,
      janela,
    };
  });
}
