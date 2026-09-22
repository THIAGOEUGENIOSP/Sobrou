import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Autorização por plano (seções 2, 7 e 23).
 *
 * Regra do projeto: a interface só pergunta o que pode MOSTRAR; quem decide o
 * que pode ACONTECER é o servidor, por estas funções. Esconder o botão de
 * exportar não é controle de acesso — qualquer um chama a rota direto.
 *
 * Os limites vivem em `plan_entitlements`, editáveis pelo admin, e nunca
 * ficam escritos no código da tela.
 */

export type FeatureKey =
  | 'fuel_entries'
  | 'shifts'
  | 'transactions'
  | 'maintenance'
  | 'reserves'
  | 'dashboard_basic'
  | 'dashboard_custom'
  | 'history_days'
  | 'vehicles_max'
  | 'fuel_compare'
  | 'goals'
  | 'ride_analyzer'
  | 'reports_advanced'
  | 'monthly_compare'
  | 'export'
  | 'custom_fields'
  | 'custom_categories';

/** O plano permite esta funcionalidade? */
export async function can(feature: FeatureKey): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('can', { p_feature: feature });
  if (error) return false; // na dúvida, nega
  return data === true;
}

/** Limite numérico da funcionalidade. `null` significa ilimitado. */
export async function planLimit(feature: FeatureKey): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('plan_limit', { p_feature: feature });
  if (error) return 0;
  return data ?? null;
}

export class PlanoInsuficienteError extends Error {
  constructor(public readonly feature: FeatureKey) {
    super(`Recurso "${feature}" não disponível no seu plano.`);
    this.name = 'PlanoInsuficienteError';
  }
}

/** Barra a execução quando o plano não cobre a funcionalidade. */
export async function requireFeature(feature: FeatureKey): Promise<void> {
  if (!(await can(feature))) throw new PlanoInsuficienteError(feature);
}

/**
 * Data mais antiga que o plano permite consultar.
 * `null` = histórico completo. Toda query de histórico recorta por aqui.
 */
export async function historyFloor(): Promise<Date | null> {
  const dias = await planLimit('history_days');
  if (dias === null) return null;
  const floor = new Date();
  floor.setDate(floor.getDate() - dias);
  floor.setHours(0, 0, 0, 0);
  return floor;
}

/** Ainda cabe mais um veículo no plano? */
export async function podeAdicionarVeiculo(): Promise<boolean> {
  const limite = await planLimit('vehicles_max');
  if (limite === null) return true;

  const supabase = await createClient();
  const { count } = await supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .is('archived_at', null);

  return (count ?? 0) < limite;
}
