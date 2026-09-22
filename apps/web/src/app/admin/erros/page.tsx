import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Log de erros (seção 20).
 *
 * O contexto é jsonb e vem da aplicação. A regra ao gravar é não colocar valor
 * financeiro nem dado pessoal aqui — o log existe para consertar o sistema,
 * não para inspecionar a vida de ninguém.
 */
export default async function AdminErrosPage() {
  const supabase = await createClient();

  const { data: erros, error } = await supabase
    .from('error_logs')
    .select('id, level, message, context, occurred_at, user_id')
    .order('occurred_at', { ascending: false })
    .limit(100);

  if (error) {
    return <p className="text-[var(--color-alerta)]">Não foi possível carregar os erros.</p>;
  }

  const cor = (nivel: string) =>
    nivel === 'warn' ? 'var(--color-tinta-suave)' : 'var(--color-alerta)';

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Erros</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Últimos 100 registros, do mais recente para o mais antigo.
      </p>

      {(erros ?? []).length === 0 ? (
        <div className="rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nenhum erro registrado.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          {(erros ?? []).map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-medium" style={{ color: cor(e.level) }}>
                  {e.message}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-tinta-suave)]">
                  {new Date(e.occurred_at).toLocaleString('pt-BR')}
                </span>
              </div>
              {e.context !== null && Object.keys(e.context as object).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--color-papel-suave)] p-2 text-xs">
                  {JSON.stringify(e.context, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
