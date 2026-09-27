'use client';

import { useState } from 'react';
import Link from 'next/link';

const OPCOES = [
  { href: '/app/lancamentos/novo', rotulo: 'Nova despesa' },
  { href: '/app/abastecimentos/novo', rotulo: 'Abastecimento' },
  { href: '/app/manutencoes/nova', rotulo: 'Manutenção' },
] as const;

/**
 * Botão flutuante "+" — suspenso acima da barra de navegação, no mesmo
 * espírito dela. Como ainda não existe uma tela única de "nova transação"
 * (cada tipo tem seu próprio formulário), ele abre um pequeno leque com os 3
 * destinos em vez de decidir por você.
 */
export function BotaoNovaTransacao() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {aberto && (
        <button
          type="button"
          aria-label="Fechar"
          className="fixed inset-0 z-30 bg-black/30"
          onClick={() => setAberto(false)}
        />
      )}

      <div
        className="fixed right-4 z-40 flex flex-col items-end gap-2"
        style={{ bottom: 'calc(6.75rem + max(env(safe-area-inset-bottom, 0px), 0.75rem))' }}
      >
        {aberto &&
          OPCOES.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="rounded-full py-2.5 pl-4 pr-4 text-sm font-medium shadow-lg"
              style={{
                background: 'var(--color-papel-elevado)',
                border: '1px solid var(--color-borda)',
                boxShadow: '0 8px 20px -6px rgba(15, 18, 24, 0.35)',
              }}
              onClick={() => setAberto(false)}
            >
              {o.rotulo}
            </Link>
          ))}

        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? 'Fechar' : 'Nova transação'}
          aria-expanded={aberto}
          className="flex h-14 w-14 items-center justify-center rounded-full text-white"
          style={{
            background: 'var(--color-marca)',
            boxShadow: '0 14px 30px -8px rgba(15, 18, 24, 0.5)',
            transform: aberto ? 'rotate(45deg)' : undefined,
            transition: 'transform 0.15s ease',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </>
  );
}
