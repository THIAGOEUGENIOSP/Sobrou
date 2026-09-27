'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BotaoSair } from '@/components/botao-sair';

const ITENS = [
  { href: '/app', rotulo: 'Meu dia', icone: 'dia' },
  { href: '/app/consultor', rotulo: 'Consultor', icone: 'consultor' },
  { href: '/app/turno', rotulo: 'Turno', icone: 'turno' },
  { href: '/app/abastecimentos', rotulo: 'Posto', icone: 'posto' },
  { href: '/app/reservas', rotulo: 'Reservas', icone: 'reservas' },
  { href: '/app/relatorios', rotulo: 'Relatórios', icone: 'relatorios' },
] as const;

const ICONES: Record<(typeof ITENS)[number]['icone'], React.ReactNode> = {
  dia: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  consultor: (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.55.42.95.9 1.05 1.5l.05.7h5l.05-.7c.1-.6.5-1.08 1.05-1.5A6 6 0 0 0 12 3Z" />
  ),
  turno: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  posto: <path d="M12 3s6 6.5 6 10.5a6 6 0 1 1-12 0C6 9.5 12 3 12 3Z" />,
  reservas: (
    <>
      <rect x="3.5" y="10" width="17" height="9" rx="2" />
      <path d="M7 10V8a5 5 0 0 1 10 0v2" />
    </>
  ),
  relatorios: <path d="M4 19V10M10 19V5M16 19v-7M3 19h18" />,
};

function Icone({ id }: { id: (typeof ITENS)[number]['icone'] }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONES[id]}
    </svg>
  );
}

/**
 * Cabeçalho + menu de navegação em gaveta lateral.
 *
 * Com 6 destinos mais Ajustes/Conta/Admin, nem cabeçalho nem rodapé
 * seguravam tudo direito numa tela estreita — vira uma gaveta que abre
 * sob demanda em vez de brigar por espaço o tempo todo.
 */
export function AppNav({ admin }: { admin: boolean }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  function ativo(href: string) {
    return href === '/app' ? pathname === '/app' : pathname.startsWith(href);
  }

  function classeItem(href: string) {
    return `flex items-center gap-3 rounded-[0.65rem] px-3 py-2.5 text-sm font-medium ${
      ativo(href)
        ? 'bg-[var(--color-marca-suave)] text-[var(--color-marca)]'
        : 'text-[var(--color-tinta-suave)]'
    }`;
  }

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <Link href="/app" className="text-lg font-bold">
          Sobrou
        </Link>
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'var(--color-papel-suave)' }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[82vw] flex-col bg-[var(--color-papel)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-borda)] p-4">
              <span className="font-bold">Menu</span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="p-1"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-2">
              {ITENS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setAberto(false)}
                  className={classeItem(item.href)}
                >
                  <Icone id={item.icone} />
                  {item.rotulo}
                </Link>
              ))}

              <div className="my-2 border-t border-[var(--color-borda)]" />

              {admin && (
                <Link
                  href="/admin"
                  onClick={() => setAberto(false)}
                  className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium text-[var(--color-marca)]"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/app/ajustes"
                onClick={() => setAberto(false)}
                className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium text-[var(--color-tinta-suave)]"
              >
                Ajustes
              </Link>
              <Link
                href="/app/conta"
                onClick={() => setAberto(false)}
                className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium text-[var(--color-tinta-suave)]"
              >
                Conta
              </Link>
            </nav>

            <div className="border-t border-[var(--color-borda)] p-3">
              <BotaoSair className="text-sm text-[var(--color-tinta-suave)]" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
