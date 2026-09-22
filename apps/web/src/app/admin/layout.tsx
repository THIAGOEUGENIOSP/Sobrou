import Link from 'next/link';
import { exigirAdmin } from '@/lib/admin/guarda';
import { BotaoSair } from '@/components/botao-sair';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Administração — Sobrou' };

/**
 * Área administrativa, separada do app do motorista.
 *
 * Nada aqui lê dado financeiro de usuário: as telas consomem só funções
 * agregadas. O administrador vê quantos usuários existem e como o produto é
 * usado, não quanto cada motorista ganhou.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-6 pb-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href="/admin" className="font-bold">
          Sobrou <span className="text-[var(--color-tinta-suave)]">admin</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/app" className="text-[var(--color-tinta-suave)]">
            Ir para o app
          </Link>
          <BotaoSair className="text-[var(--color-tinta-suave)]" />
        </nav>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ['/admin', 'Métricas'],
            ['/admin/usuarios', 'Usuários'],
            ['/admin/planos', 'Planos'],
            ['/admin/erros', 'Erros'],
          ] as const
        ).map(([href, rotulo]) => (
          <Link
            key={href}
            href={href}
            className="shrink-0 rounded-full border border-[var(--color-borda)] px-4 py-2 text-sm"
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
