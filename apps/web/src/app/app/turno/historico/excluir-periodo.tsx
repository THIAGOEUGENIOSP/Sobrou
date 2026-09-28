'use client';

import { useActionState, useState } from 'react';
import { excluirTurnosPorPeriodo } from '@/lib/turnos/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

/** Exclusão em lote por período — o que antes só dava pra fazer me pedindo
 * pra apagar direto no banco, agora é uma ação do próprio app. Fica escondida
 * atrás de um botão porque é uma ação incomum e "grande" pra deixar solta na
 * tela. */
export function ExcluirPeriodo() {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useActionState(excluirTurnosPorPeriodo, {});

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm font-medium"
        style={{ color: 'var(--color-alerta)' }}
      >
        Excluir vários turnos de uma vez
      </button>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-cartao)] p-4"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <p className="mb-3 text-sm font-medium">Excluir todos os turnos fechados num período</p>
      <form action={acao} noValidate>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="De" name="de" type="date" required erro={estado.campos?.de} />
          <Campo label="Até" name="ate" type="date" required erro={estado.campos?.ate} />
        </div>
        <p className="-mt-2 mb-4 text-xs text-[var(--color-tinta-suave)]">
          Isso não pode ser desfeito. Todos os turnos fechados nesse intervalo (incluindo as
          corridas e reservas de cada um) serão apagados.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="flex-1 rounded-full border px-6 py-3 text-sm font-medium"
            style={{ borderColor: 'var(--color-borda)', color: 'var(--color-tinta-suave)' }}
          >
            Cancelar
          </button>
          <div className="flex-1">
            <BotaoEnviar>Excluir período</BotaoEnviar>
          </div>
        </div>
      </form>
    </div>
  );
}
