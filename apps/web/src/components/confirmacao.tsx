import Link from 'next/link';
import type { Route } from 'next';

/**
 * Banner de "acabei de salvar isso, e é aqui que ele foi parar" — a resposta
 * direta ao pedido de saber onde a informação preenchida vai aparecer.
 * Aparece uma vez, logo depois do redirecionamento pós-salvamento, e se fecha
 * sozinho ao navegar (a URL com `?ok=` some assim que a pessoa sai da tela).
 */
export function Confirmacao({
  children,
  fecharHref,
}: {
  children: React.ReactNode;
  fecharHref: Route;
}) {
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-[var(--radius-cartao)] p-4"
      style={{ background: 'var(--color-positivo-suave)', border: '1px solid var(--color-positivo)' }}
    >
      <span
        className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold"
        style={{ background: 'var(--color-positivo)', color: '#04150f' }}
        aria-hidden
      >
        ✓
      </span>
      <p className="flex-1 text-sm" style={{ color: 'var(--color-positivo)' }}>
        {children}
      </p>
      <Link
        href={fecharHref}
        aria-label="Fechar aviso"
        className="flex-none text-sm"
        style={{ color: 'var(--color-positivo)' }}
      >
        ✕
      </Link>
    </div>
  );
}
