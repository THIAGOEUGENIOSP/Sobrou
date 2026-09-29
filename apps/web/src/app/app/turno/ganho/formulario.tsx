'use client';

import { useActionState, useMemo, useState } from 'react';
import { formatRate } from '@sobrou/finance';
import { adicionarGanho } from '@/lib/turnos/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, BotaoEnviar, Campo, CampoMoeda } from '@/components/formulario';

function diaDaSemanaHoje(): string {
  const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

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
  const [valor, setValor] = useState<number | null>(null);
  const [km, setKm] = useState('');
  const [duracaoMin, setDuracaoMin] = useState('');

  // Prévia ao vivo: só aparece quando dá pra calcular de verdade (valor e o
  // campo em questão preenchidos). É a mesma conta que "Detalhes da corrida"
  // mostra depois — aqui só adianta pro motorista ver antes de salvar.
  const rsKm = useMemo(() => {
    const k = lerNumeroBR(km);
    return valor !== null && Number.isFinite(k) && k > 0 ? valor / k : null;
  }, [valor, km]);
  const rsHora = useMemo(() => {
    const min = lerNumeroBR(duracaoMin);
    return valor !== null && Number.isFinite(min) && min > 0 ? valor / (min / 60) : null;
  }, [valor, duracaoMin]);

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="shift_id" value={shiftId} />
      <input type="hidden" name="category_id" value={escolhida} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <p className="-mt-1 mb-4 text-sm text-[var(--color-tinta-suave)]">{diaDaSemanaHoje()}</p>

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

      <CampoMoeda
        label="Valor da corrida"
        name="valor"
        required
        autoFocus
        erro={estado.campos?.valor}
        onValorChange={setValor}
      />
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
          <div className="grid grid-cols-2 gap-3">
            <Campo
              label="Km rodados"
              name="km"
              inputMode="decimal"
              placeholder="8,4"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              erro={estado.campos?.km}
            />
            <Campo
              label="Duração (min)"
              name="duracao_min"
              inputMode="numeric"
              placeholder="22"
              value={duracaoMin}
              onChange={(e) => setDuracaoMin(e.target.value)}
              erro={estado.campos?.duracao_min}
            />
          </div>
          <Campo
            label="Nota do passageiro"
            name="nota_passageiro"
            inputMode="decimal"
            placeholder="5"
            erro={estado.campos?.nota_passageiro}
          />

          {(rsKm !== null || rsHora !== null) && (
            <div
              className="mb-4 flex gap-4 rounded-[var(--radius-cartao)] p-3 text-sm"
              style={{ background: 'var(--color-papel-suave)' }}
            >
              {rsKm !== null && (
                <span>
                  <span className="block text-xs text-[var(--color-tinta-suave)]">R$ por km</span>
                  <strong className="tabular">{formatRate(rsKm, 'km')}</strong>
                </span>
              )}
              {rsHora !== null && (
                <span>
                  <span className="block text-xs text-[var(--color-tinta-suave)]">R$ por hora</span>
                  <strong className="tabular">{formatRate(rsHora, 'h')}</strong>
                </span>
              )}
            </div>
          )}
        </fieldset>
      )}

      <BotaoEnviar>Adicionar ganho</BotaoEnviar>
    </form>
  );
}
