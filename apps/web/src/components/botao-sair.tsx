'use client';

import { sair } from '@/lib/auth/actions';

/**
 * Sair da conta.
 *
 * Antes de encerrar a sessão, manda o service worker apagar o que ele
 * guardou. O worker não guarda página autenticada, mas num celular
 * compartilhado — coisa comum entre motoristas que dividem o carro — o certo
 * é não deixar nada para trás.
 */
export function BotaoSair({ className }: { className?: string }) {
  return (
    <form
      action={sair}
      onSubmit={() => {
        navigator.serviceWorker?.controller?.postMessage('limpar-cache');
      }}
    >
      <button type="submit" className={className}>
        Sair
      </button>
    </form>
  );
}
