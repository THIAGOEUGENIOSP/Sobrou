import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const POR_PAGINA = 50;

/**
 * Lista de contas — sem um único valor financeiro (seção 22).
 *
 * A função `admin_users` no banco devolve e-mail, datas, plano e status. Ela
 * não devolve faturamento, despesa nem saldo de reserva, e o admin não tem
 * policy nas tabelas financeiras: mesmo querendo, esta tela não conseguiria
 * mostrar quanto um motorista ganhou.
 */
export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.p ?? '1') || 1);
  const offset = (pagina - 1) * POR_PAGINA;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_users', {
    p_limit: POR_PAGINA,
    p_offset: offset,
  });

  if (error) {
    return <p className="text-[var(--color-alerta)]">Não foi possível carregar os usuários.</p>;
  }

  const usuarios = data ?? [];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Usuários</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Esta tela não exibe dados financeiros de ninguém.
      </p>

      {usuarios.length === 0 ? (
        <p className="text-sm text-[var(--color-tinta-suave)]">Nenhuma conta nesta página.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          {usuarios.map((u) => (
            <li key={u.user_id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{u.email}</span>
                <span className="shrink-0 text-sm">
                  {u.plan_code ?? 'free'}
                  {u.sub_status && (
                    <span className="ml-1 text-[var(--color-tinta-suave)]">{u.sub_status}</span>
                  )}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-[var(--color-tinta-suave)]">
                <span>Criada em {data_(u.created_at)}</span>
                <span>Último acesso: {data_(u.last_sign_in_at)}</span>
                <span>Última atividade: {data_(u.ultimo_evento)}</span>
                {!u.onboarding_done && (
                  <span className="text-[var(--color-alerta)]">onboarding incompleto</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <nav className="mt-6 flex items-center justify-between gap-3 text-sm">
        {pagina > 1 ? (
          <a href={`/admin/usuarios?p=${pagina - 1}`} className="text-[var(--color-marca)]">
            ← Anteriores
          </a>
        ) : (
          <span />
        )}
        <span className="text-[var(--color-tinta-suave)]">Página {pagina}</span>
        {usuarios.length === POR_PAGINA ? (
          <a href={`/admin/usuarios?p=${pagina + 1}`} className="text-[var(--color-marca)]">
            Próximos →
          </a>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}

function data_(valor: string | null): string {
  return valor ? new Date(valor).toLocaleDateString('pt-BR') : '—';
}
