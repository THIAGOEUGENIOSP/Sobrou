'use client';

import { useActionState, useState } from 'react';
import { lancarTransacao } from '@/lib/turnos/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

type Categoria = { id: string; name: string; favorita: boolean };

/**
 * Despesa em poucos toques (seção 24): as categorias favoritas aparecem como
 * chips grandes, então o caso comum — almoço, pedágio, lavagem — é um toque
 * na categoria, o valor e pronto.
 */
export function FormularioLancamento({
  categorias,
  shiftId,
  vehicleId,
}: {
  categorias: Categoria[];
  shiftId: string;
  vehicleId: string;
}) {
  const [estado, acao] = useActionState(lancarTransacao, {});
  const favoritas = categorias.filter((c) => c.favorita);
  const demais = categorias.filter((c) => !c.favorita);
  const [escolhida, setEscolhida] = useState(favoritas[0]?.id ?? categorias[0]?.id ?? '');

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="shift_id" value={shiftId} />
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <input type="hidden" name="category_id" value={escolhida} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      {favoritas.length > 0 && (
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium">Categoria</legend>
          <div className="flex flex-wrap gap-2">
            {favoritas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEscolhida(c.id)}
                className="rounded-full border px-4 py-2.5 text-sm"
                style={{
                  borderColor: escolhida === c.id ? 'var(--color-marca)' : 'var(--color-borda)',
                  color: escolhida === c.id ? 'var(--color-marca)' : undefined,
                  fontWeight: escolhida === c.id ? 600 : 400,
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {demais.length > 0 && (
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">
            {favoritas.length > 0 ? 'Outra categoria' : 'Categoria'}
          </span>
          <select
            value={demais.some((c) => c.id === escolhida) ? escolhida : ''}
            onChange={(e) => e.target.value && setEscolhida(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
          >
            <option value="">Escolher…</option>
            {demais.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {estado.campos?.category_id && (
        <p className="mb-3 text-sm text-[var(--color-alerta)]">{estado.campos.category_id}</p>
      )}

      <Campo
        label="Valor"
        name="valor"
        inputMode="decimal"
        placeholder="20,00"
        required
        autoFocus
        erro={estado.campos?.valor}
      />
      <Campo
        label="Descrição (opcional)"
        name="description"
        placeholder="Almoço no posto"
        erro={estado.campos?.description}
      />

      <BotaoEnviar>Lançar despesa</BotaoEnviar>
    </form>
  );
}
