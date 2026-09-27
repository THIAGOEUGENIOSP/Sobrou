'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
      width="20"
      height="20"
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
 * Navegação fixa no rodapé.
 *
 * Ícone + rótulo curto em vez de só texto: com 6 destinos, texto puro
 * espremia tudo numa linha só e ficava ilegível em telas estreitas.
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--color-borda)] bg-[var(--color-papel)]">
      <div className="mx-auto flex max-w-lg">
        {ITENS.map((item) => {
          const ativo =
            item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-center ${
                ativo ? 'text-[var(--color-marca)]' : 'text-[var(--color-tinta-suave)]'
              }`}
            >
              <Icone id={item.icone} />
              <span className="text-[10px] leading-none font-semibold">{item.rotulo}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
