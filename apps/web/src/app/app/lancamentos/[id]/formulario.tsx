'use client';

import { useActionState, useState } from 'react';
import { atualizarTransacao, excluirTransacaoEVoltar } from '@/lib/turnos/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

type Categoria = { id: string; name: string; favorita: boolean };

export function FormularioEditarLancamento({
  id,
  categoriaAtual,
  valorAtual,
  descricaoAtual,
  categorias,
}: {
  id: string;
  categoriaAtual: string;
  valorAtual: number;
  descricaoAtual: string;
  categorias: Categoria[];
}) {
  const [estado, acao] = useActionState(atualizarTransacao, {});
  const favoritas = categorias.filter((c) => c.favorita);
  const demais = categorias.filter((c) => !c.favorita);
  const [escolhida, setEscolhida] = useState(categoriaAtual);

  return (
    <>
      <form action={acao} noValidate>
        <input type="hidden" name="id" value={id} />
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
                  className="rounded-full px-4 py-2.5 text-sm font-medium"
                  style={
                    escolhida === c.id
                      ? { background: 'var(--color-marca)', color: '#fff' }
                      : { background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }
                  }
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
          defaultValue={valorAtual.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          required
          erro={estado.campos?.valor}
        />
        <Campo
          label="Descrição (opcional)"
          name="description"
          defaultValue={descricaoAtual}
          erro={estado.campos?.description}
        />

        <BotaoEnviar>Salvar alterações</BotaoEnviar>
      </form>

      <form action={excluirTransacaoEVoltar} className="mt-3">
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="w-full py-3 text-center text-sm"
          style={{ color: 'var(--color-alerta)' }}
        >
          Excluir lançamento
        </button>
      </form>
    </>
  );
}
