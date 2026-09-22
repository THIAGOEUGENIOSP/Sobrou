import { formatMoney, formatNumber } from '@sobrou/finance';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Metricas {
  usuarios_total?: number;
  novos_7d?: number;
  novos_30d?: number;
  ativos_7d?: number;
  ativos_30d?: number;
  onboarding_concluido?: number;
  assinaturas?: Record<string, number>;
  mrr_estimado?: number;
  uso_30d?: Record<string, number>;
  erros_7d?: number;
}

const ROTULO_EVENTO: Record<string, string> = {
  turno_iniciado: 'Turnos iniciados',
  turno_fechado: 'Turnos fechados',
  abastecimento_registrado: 'Abastecimentos',
  abastecimento_editado: 'Abastecimentos editados',
  manutencao_registrada: 'Manutenções',
  corrida_avaliada: 'Corridas avaliadas',
  meta_definida: 'Metas definidas',
  onboarding_concluido: 'Onboardings concluídos',
  export_csv: 'Exportações CSV',
  export_xlsx: 'Exportações Excel',
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_metrics');
  const m = (data ?? {}) as Metricas;

  if (error) {
    return <p className="text-[var(--color-alerta)]">Não foi possível carregar as métricas.</p>;
  }

  const eventos = Object.entries(m.uso_30d ?? {}).sort((a, b) => b[1] - a[1]);
  const maior = Math.max(...eventos.map(([, v]) => v), 1);

  return (
    <>
      <h1 className="mb-6 text-xl font-bold">Métricas</h1>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metrica titulo="Usuários" valor={formatNumber(m.usuarios_total ?? 0, 0)} />
        <Metrica titulo="Novos em 7 dias" valor={formatNumber(m.novos_7d ?? 0, 0)} />
        <Metrica titulo="Novos em 30 dias" valor={formatNumber(m.novos_30d ?? 0, 0)} />
        <Metrica
          titulo="Ativos em 7 dias"
          valor={formatNumber(m.ativos_7d ?? 0, 0)}
          detalhe={proporcao(m.ativos_7d, m.usuarios_total)}
        />
        <Metrica
          titulo="Ativos em 30 dias"
          valor={formatNumber(m.ativos_30d ?? 0, 0)}
          detalhe={proporcao(m.ativos_30d, m.usuarios_total)}
        />
        <Metrica
          titulo="Onboarding concluído"
          valor={formatNumber(m.onboarding_concluido ?? 0, 0)}
          detalhe={proporcao(m.onboarding_concluido, m.usuarios_total)}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Assinaturas</h2>
        <div className="mb-3 rounded-[var(--radius-cartao)] border border-[var(--color-marca)] p-4">
          <p className="text-sm text-[var(--color-tinta-suave)]">Receita recorrente estimada</p>
          <p className="tabular mt-1 text-2xl font-bold text-[var(--color-marca)]">
            {formatMoney(m.mrr_estimado ?? 0)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
            Soma do preço mensal das assinaturas ativas. Não conta quem está em teste.
          </p>
        </div>

        {Object.keys(m.assinaturas ?? {}).length === 0 ? (
          <p className="text-sm text-[var(--color-tinta-suave)]">Nenhuma assinatura ainda.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
            {Object.entries(m.assinaturas ?? {})
              .sort((a, b) => b[1] - a[1])
              .map(([chave, qtd]) => {
                const [plano, status] = chave.split(':');
                return (
                  <li key={chave} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>
                      {plano}
                      <span className="ml-2 text-[var(--color-tinta-suave)]">{status}</span>
                    </span>
                    <span className="tabular font-medium">{qtd}</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-1 font-semibold">Uso nos últimos 30 dias</h2>
        <p className="mb-3 text-sm text-[var(--color-tinta-suave)]">
          Contagem de eventos. Nenhum valor financeiro é registrado aqui.
        </p>

        {eventos.length === 0 ? (
          <p className="text-sm text-[var(--color-tinta-suave)]">Nenhum evento registrado.</p>
        ) : (
          <ul className="space-y-2.5">
            {eventos.map(([chave, qtd]) => (
              <li key={chave}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>{ROTULO_EVENTO[chave] ?? chave}</span>
                  <span className="tabular font-medium">{qtd}</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{ background: 'var(--color-papel-suave)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(qtd / maior) * 100}%`, background: 'var(--color-marca)' }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(m.erros_7d ?? 0) > 0 && (
        <p className="text-sm text-[var(--color-alerta)]">
          {m.erros_7d} erro(s) registrado(s) nos últimos 7 dias.
        </p>
      )}
    </>
  );
}

function proporcao(parte?: number, total?: number): string | undefined {
  if (!parte || !total) return undefined;
  return `${formatNumber((parte / total) * 100, 0)}% da base`;
}

function Metrica({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe?: string | undefined;
}) {
  return (
    <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4">
      <p className="text-sm text-[var(--color-tinta-suave)]">{titulo}</p>
      <p className="tabular mt-1 text-2xl font-bold">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">{detalhe}</p>}
    </div>
  );
}
