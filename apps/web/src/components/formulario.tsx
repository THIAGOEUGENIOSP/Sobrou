'use client';

import { useFormStatus } from 'react-dom';

/** Peças de formulário reaproveitadas pelas telas de autenticação. */

export function Campo({
  label,
  name,
  erro,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; erro?: string }) {
  const id = `campo-${name}`;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base outline-none focus:border-[var(--color-marca)]"
        {...props}
      />
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm text-[var(--color-alerta)]">
          {erro}
        </p>
      )}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: 'erro' | 'sucesso'; children: React.ReactNode }) {
  const cor = tipo === 'erro' ? 'var(--color-alerta)' : 'var(--color-positivo)';
  return (
    <p
      role="status"
      className="mb-4 rounded-xl border px-4 py-3 text-sm"
      style={{ borderColor: cor, color: cor }}
    >
      {children}
    </p>
  );
}

export function BotaoEnviar({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[var(--color-marca)] px-6 py-3 font-semibold text-white disabled:opacity-60"
    >
      {pending ? 'Aguarde…' : children}
    </button>
  );
}
