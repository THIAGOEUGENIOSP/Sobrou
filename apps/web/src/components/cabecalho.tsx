import Link from 'next/link';

/**
 * Peças de cabeçalho reaproveitadas pelas telas principais (Painel,
 * Transações, Relatórios, Metas, Consultor) — mesma marca, mesmo lugar pro
 * sino, em todo canto.
 */

export function LogoSobrou() {
  return (
    <span className="flex items-center gap-1.5 text-lg font-extrabold">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-marca)" aria-hidden>
        <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z" />
      </svg>
      Sobrou
    </span>
  );
}

/**
 * Sino do cabeçalho: por enquanto é só um lugar reservado — o app ainda não
 * tem central de notificações de verdade, então o botão não finge que tem.
 * Nada de link nem badge de contagem: seria inventar uma funcionalidade que
 * não existe.
 */
export function BotaoSino() {
  return (
    <button
      type="button"
      aria-label="Notificações (em breve)"
      title="Notificações — em breve"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
      style={{ color: 'var(--color-tinta-suave)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </button>
  );
}

/** Engrenagem do cabeçalho — vai direto pra Ajustes, sem menu escondido. */
export function BotaoAjustes() {
  return (
    <Link
      href="/app/ajustes"
      aria-label="Ajustes"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
      style={{ color: 'var(--color-tinta)' }}
    >
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.37.58.66.77.29.19.63.29.99.29H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    </Link>
  );
}

/** Cabeçalho padrão de tela: título à esquerda, sino à direita. */
export function CabecalhoTela({ titulo }: { titulo: string }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <BotaoSino />
    </div>
  );
}
