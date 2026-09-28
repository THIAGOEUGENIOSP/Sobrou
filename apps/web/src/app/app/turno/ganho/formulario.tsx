'use client';

import { useActionState, useState } from 'react';
import { adicionarGanho } from '@/lib/turnos/actions';
import { Aviso, BotaoEnviar, Campo, CampoMoeda } from '@/components/formulario';

type Plataforma = { id: string; name: string; favorita: boolean };

/**
 * Registro de uma corrida, em tempo real (mockup: "Adicionar ganho").
 *
 * Só três campos aparecem de cara — plataforma, valor e corridas — porque é
 * isso que dá pra digitar com o carro parado no farol. Km, duração e nota do
 * passageiro ficam atrás de "Mais detalhes": quem não quiser informar não
 * perde nada, e a tela de "Detalhes da corrida" só mostra o que realmente
 * foi preenchido aqui.
 */
export function FormularioGanho({
  shiftId,
  plataformas,
}: {
  shiftId: string;
  plataformas: Plataforma[];
}) {
  const [estado, acao] = useActionState(adicionarGanho, {});
  const favoritas = plataformas.filter((p) => p.favorita);
  const demais = plataformas.filter((p) => !p.favorita);
  const [escolhida, setEscolhida] = useState(favoritas[0]?.id ?? plataformas[0]?.id ?? '');
  const [maisDetalhes, setMaisDetalhes] = useState(false);

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="shift_id" value={shiftId} />
      <input type="hidden" name="category_id" value={escolhida} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      {favoritas.length > 0 && (
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium">Plataforma</legend>
          <div className="flex flex-wrap gap-2">
            {favoritas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setEscolhida(p.id)}
                className="rounded-full border px-4 py-2.5 text-sm"
                style={{
                  borderColor: escolhida === p.id ? 'var(--color-marca)' : 'var(--color-borda)',
                  color: escolhida === p.id ? 'var(--color-marca)' : undefined,
                  fontWeight: escolhida === p.id ? 600 : 400,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {demais.length > 0 && (
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">
            {favoritas.length > 0 ? 'Outra plataforma' : 'Plataforma'}
          </span>
          <select
            value={demais.some((p) => p.id === escolhida) ? escolhida : ''}
            onChange={(e) => e.target.value && setEscolhida(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
          >
            <option value="">Escolher…</option>
            {demais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {estado.campos?.category_id && (
        <p className="mb-3 text-sm text-[var(--color-alerta)]">{estado.campos.category_id}</p>
      )}

      <CampoMoeda label="Valor da corrida" name="valor" required autoFocus erro={estado.campos?.valor} />
      <Campo
        label="Quantas corridas (opcional)"
        name="qtd_corridas"
        inputMode="numeric"
        placeholder="1"
        erro={estado.campos?.qtd_corridas}
      />
      <p className="-mt-2 mb-4 text-sm text-[var(--color-tinta-suave)]">
        Deixe em branco se foi uma corrida só. Preencha aqui só se esse valor for a soma de várias
        corridas juntas.
      </p>

      {!maisDetalhes ? (
        <button
          type="button"
          onClick={() => setMaisDetalhes(true)}
          className="mb-4 text-sm font-medium text-[var(--color-marca)]"
        >
          + Mais detalhes (km, duração, nota do passageiro)
        </button>
      ) : (
        <fieldset className="mb-2">
          <legend className="mb-2 text-sm font-medium">Mais detalhes (opcional)</legend>
          <Campo
            label="Km da corrida"
            name="km"
            inputMode="decimal"
            placeholder="8,4"
            erro={estado.campos?.km}
          />
          <Campo
            label="Duração (minutos)"
            name="duracao_min"
            inputMode="numeric"
            placeholder="22"
            erro={estado.campos?.duracao_min}
          />
          <Campo
            label="Nota do passageiro"
            name="nota_passageiro"
            inputMode="decimal"
            placeholder="5"
            erro={estado.campos?.nota_passageiro}
          />
        </fieldset>
      )}

      <BotaoEnviar>Adicionar ganho</BotaoEnviar>
    </form>
  );
}
