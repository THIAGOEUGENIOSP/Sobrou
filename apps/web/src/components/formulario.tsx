'use client';

import { useState } from 'react';
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

/**
 * Campo de valor em reais que se formata sozinho, dígito a dígito — igual a
 * um caixa eletrônico: cada tecla entra como centavo, "R$" e separador de
 * milhar aparecem sem o motorista precisar digitar vírgula ou ponto. O texto
 * exibido já sai no formato que `lerNumeroBR` espera ("1.234,56"), então o
 * `name` deste input é o mesmo que o schema do formulário já validava — nada
 * muda no servidor.
 */
export function CampoMoeda({
  label,
  name,
  erro,
  required,
  valorInicial,
  autoFocus,
}: {
  label: string;
  name: string;
  erro?: string;
  required?: boolean;
  /** Valor inicial em reais (ex.: 18.5), para formulários de edição. */
  valorInicial?: number | null;
  autoFocus?: boolean;
}) {
  const id = `campo-${name}`;
  const [centavos, setCentavos] = useState<number | null>(
    valorInicial != null ? Math.round(valorInicial * 100) : null,
  );

  const exibido =
    centavos === null
      ? ''
      : (centavos / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '');
    setCentavos(digitos === '' ? null : Number(digitos));
  }

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--color-tinta-suave)]"
          aria-hidden
        >
          R$
        </span>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete="off"
          value={exibido}
          onChange={aoDigitar}
          placeholder="0,00"
          required={required}
          autoFocus={autoFocus}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : undefined}
          className="tabular w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] py-3 pl-10 pr-4 text-base outline-none focus:border-[var(--color-marca)]"
        />
      </div>
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
