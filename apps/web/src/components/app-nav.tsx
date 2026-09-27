'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BotaoSair } from '@/components/botao-sair';

/** Os 4 destinos mais usados — ficam sempre à mão, na barra flutuante. */
const ITENS_PRINCIPAIS = [
  { href: '/app', rotulo: 'Painel', icone: 'dia' },
  { href: '/app/turno', rotulo: 'Turno', icone: 'turno' },
  { href: '/app/transacoes', rotulo: 'Transações', icone: 'transacoes' },
  { href: '/app/relatorios', rotulo: 'Relatórios', icone: 'relatorios' },
] as const;

/** O resto — menos usado no dia a dia — mora atrás do botão "Mais". */
const ITENS_MAIS = [
  { href: '/app/consultor', rotulo: 'Consultor', icone: 'consultor' },
  { href: '/app/abastecimentos', rotulo: 'Posto', icone: 'posto' },
  { href: '/app/reservas', rotulo: 'Reservas', icone: 'reservas' },
  { href: '/app/mensal', rotulo: 'Mês a mês', icone: 'mensal' },
] as const;

type Icone =
  | (typeof ITENS_PRINCIPAIS)[number]['icone']
  | (typeof ITENS_MAIS)[number]['icone']
  | 'mais';

const ICONES: Record<Icone, React.ReactNode> = {
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
  transacoes: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  mensal: (
    <>
      <rect x="4" y="12" width="3.4" height="7" rx="0.8" />
      <rect x="10.3" y="7" width="3.4" height="12" rx="0.8" />
      <rect x="16.6" y="3.5" width="3.4" height="15.5" rx="0.8" />
    </>
  ),
  mais: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
};

function IconeSvg({ id, tamanho = 20 }: { id: Icone; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
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
 * Cabeçalho simples + barra de navegação flutuante.
 *
 * Trocamos o menu hambúrguer (ícone pequeno, gaveta lateral) por uma barra
 * suspensa no rodapé, com os 4 destinos mais usados sempre visíveis e alvos
 * de toque grandes — o motorista usa isso de pé, com uma mão só. O resto dos
 * destinos (menos usados no dia a dia) mora atrás do botão "Mais", que abre
 * uma folha subindo do rodapé.
 */
export function AppNav({ admin }: { admin: boolean }) {
  const [maisAberto, setMaisAberto] = useState(false);
  const pathname = usePathname();

  function ativo(href: string) {
    return href === '/app' ? pathname === '/app' : pathname.startsWith(href);
  }

  const algumItemMaisAtivo =
    ITENS_MAIS.some((i) => ativo(i.href)) ||
    ativo('/app/ajustes') ||
    ativo('/app/conta') ||
    (admin && ativo('/admin'));

  function fecharMais() {
    setMaisAberto(false);
  }

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <Link href="/app" className="text-lg font-bold">
          Sobrou
        </Link>
      </header>

      {/* Barra flutuante: não gruda nas bordas nem no rodapé — fica "suspensa",
          com espaço ao redor e sombra funda, pra parecer um objeto por cima do
          conteúdo, não uma tira colada na tela. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
        aria-label="Navegação principal"
      >
        <div
          className="flex w-full max-w-lg items-stretch gap-1 rounded-[1.5rem] border p-1.5"
          style={{
            background: 'var(--color-papel-elevado)',
            borderColor: 'var(--color-borda)',
            boxShadow: '0 16px 36px -10px rgba(15, 18, 24, 0.38), 0 2px 10px rgba(15, 18, 24, 0.14)',
          }}
        >
          {ITENS_PRINCIPAIS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] py-2 text-center"
              style={
                ativo(item.href)
                  ? { background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }
                  : { color: 'var(--color-tinta-suave)' }
              }
            >
              <IconeSvg id={item.icone} />
              <span className="w-full truncate px-0.5 text-[0.63rem] font-medium leading-tight">
                {item.rotulo}
              </span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-label="Mais opções"
            aria-haspopup="dialog"
            aria-expanded={maisAberto}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] py-2 text-center"
            style={
              algumItemMaisAtivo
                ? { background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }
                : { color: 'var(--color-tinta-suave)' }
            }
          >
            <IconeSvg id="mais" />
            <span className="text-[0.63rem] font-medium leading-tight">Mais</span>
          </button>
        </div>
      </nav>

      {maisAberto && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={fecharMais}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-[1.6rem] p-2 pb-[max(env(safe-area-inset-bottom,0px),1rem)] shadow-2xl"
            style={{ background: 'var(--color-papel)' }}
          >
            <div className="mx-auto mb-1 h-1.5 w-10 flex-none rounded-full" style={{ background: 'var(--color-borda)' }} />

            <div className="flex items-center justify-between px-2 py-2">
              <span className="font-bold">Mais opções</span>
              <button type="button" onClick={fecharMais} aria-label="Fechar" className="p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mb-1 grid grid-cols-2 gap-2 px-1">
              {ITENS_MAIS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={fecharMais}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-cartao)] py-4 text-center"
                  style={
                    ativo(item.href)
                      ? { background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }
                      : { background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }
                  }
                >
                  <IconeSvg id={item.icone} tamanho={22} />
                  <span className="text-xs font-medium">{item.rotulo}</span>
                </Link>
              ))}
            </div>

            <nav className="flex-1 overflow-y-auto p-1 pt-2">
              {admin && (
                <Link
                  href="/admin"
                  onClick={fecharMais}
                  className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium"
                  style={{ color: 'var(--color-marca)' }}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/app/ajustes"
                onClick={fecharMais}
                className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}
              >
                Ajustes
              </Link>
              <Link
                href="/app/conta"
                onClick={fecharMais}
                className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}
              >
                Conta
              </Link>
            </nav>

            <div className="border-t p-3" style={{ borderColor: 'var(--color-borda)' }}>
              <BotaoSair className="text-sm text-[var(--color-tinta-suave)]" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
