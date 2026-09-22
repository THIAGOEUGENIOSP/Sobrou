import { createClient } from '@/lib/supabase/server';
import { EditorPlano } from './editor';

export const dynamic = 'force-dynamic';

/** Rótulos legíveis para as chaves de funcionalidade. */
const ROTULO: Record<string, { nome: string; unidade?: string }> = {
  fuel_entries: { nome: 'Abastecimentos' },
  shifts: { nome: 'Turnos' },
  transactions: { nome: 'Receitas e despesas' },
  maintenance: { nome: 'Manutenções' },
  reserves: { nome: 'Reservas' },
  dashboard_basic: { nome: 'Dashboard básico' },
  dashboard_custom: { nome: 'Escolher cards do dashboard' },
  history_days: { nome: 'Histórico', unidade: 'dias' },
  vehicles_max: { nome: 'Veículos', unidade: 'máx.' },
  fuel_compare: { nome: 'Etanol × gasolina' },
  goals: { nome: 'Metas' },
  ride_analyzer: { nome: 'Analisador de corridas' },
  reports_advanced: { nome: 'Relatórios avançados' },
  monthly_compare: { nome: 'Comparação entre períodos' },
  export: { nome: 'Exportação CSV e Excel' },
  custom_fields: { nome: 'Campos personalizados' },
  custom_categories: { nome: 'Categorias próprias', unidade: 'máx.' },
};

export default async function AdminPlanosPage() {
  const supabase = await createClient();

  const { data: planos } = await supabase
    .from('plans')
    .select('id, code, name, description, price_monthly, price_yearly, trial_days')
    .order('sort_order');

  const { data: limites } = await supabase
    .from('plan_entitlements')
    .select('id, plan_id, feature_key, enabled, limit_value');

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Planos e limites</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Nada aqui está escrito no código do app. Mudar um limite vale na próxima requisição de
        cada usuário, sem deploy.
      </p>

      <div className="space-y-8">
        {(planos ?? []).map((plano) => (
          <EditorPlano
            key={plano.id}
            plano={{
              id: plano.id,
              code: plano.code,
              name: plano.name,
              description: plano.description ?? '',
              price_monthly: String(plano.price_monthly).replace('.', ','),
              price_yearly: String(plano.price_yearly).replace('.', ','),
              trial_days: String(plano.trial_days),
            }}
            limites={(limites ?? [])
              .filter((l) => l.plan_id === plano.id)
              .map((l) => ({
                feature_key: l.feature_key,
                rotulo: ROTULO[l.feature_key]?.nome ?? l.feature_key,
                unidade: ROTULO[l.feature_key]?.unidade ?? '',
                enabled: l.enabled,
                limite: l.limit_value === null ? '' : String(l.limit_value).replace('.', ','),
              }))
              .sort((a, b) => a.rotulo.localeCompare(b.rotulo))}
          />
        ))}
      </div>
    </>
  );
}
