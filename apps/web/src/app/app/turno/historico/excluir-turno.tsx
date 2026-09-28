'use client';

import { useState } from 'react';
import { excluirTurnoFechado } from '@/lib/turnos/actions';

/**
 * Excluir um turno fechado apaga o dia inteiro (corridas e reservas daquele
 * turno somem com ele) — diferente de excluir uma transação avulta, aqui não
 * dá pra desfazer com um novo lançamento igual. Por isso exige um segundo
 * toque antes de agir, em vez do excluir direto que o resto do app usa.
 */
export function ExcluirTurno({ id, rotulo }: { id: string; rotulo: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="flex-none text-sm font-medium"
        style={{ color: 'var(--color-alerta)' }}
      >
        Excluir
      </button>
    );
  }

  return (
    <span className="flex flex-none items-center gap-2 text-sm">
      <span className="text-[var(--color-tinta-suave)]">Excluir {rotulo}?</span>
      <form action={excluirTurnoFechado}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="font-semibold" style={{ color: 'var(--color-alerta)' }}>
          Sim
        </button>
      </form>
      <button type="button" onClick={() => setConfirmando(false)} className="text-[var(--color-tinta-suave)]">
        Cancelar
      </button>
    </span>
  );
}
