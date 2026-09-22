'use client';

import { useEffect } from 'react';

/**
 * Tela de erro do app.
 *
 * Mostra ao motorista uma saída (tentar de novo, voltar ao início) em vez da
 * página branca do Next. O `digest` é o identificador que o Next gera no
 * servidor: com ele dá para achar o stack real no log sem expor nada aqui.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção a mensagem já vem redigida pelo Next; o console é só para
    // o desenvolvimento.
    console.error('[KM Legal]', error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12 text-center">
      <h1 className="mb-2 text-2xl font-bold">Algo deu errado</h1>
      <p className="mb-6 text-[var(--color-tinta-suave)]">
        Seus dados estão salvos. Foi esta tela que não carregou.
      </p>

      <button
        type="button"
        onClick={reset}
        className="mb-3 w-full rounded-full bg-[var(--color-marca)] px-6 py-3 font-semibold text-white"
      >
        Tentar de novo
      </button>

      <a
        href="/app"
        className="w-full rounded-full border border-[var(--color-borda)] px-6 py-3 font-semibold"
      >
        Voltar para o início
      </a>

      {error.digest && (
        <p className="mt-6 text-xs text-[var(--color-tinta-suave)]">
          Código do erro: {error.digest}
        </p>
      )}
    </main>
  );
}
