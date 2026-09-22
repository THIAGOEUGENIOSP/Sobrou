'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState, useMemo, useState } from 'react';
import {
  avaliarCorrida,
  formatMoney,
  formatNumber,
  formatRate,
  valorMinimoAceitavel,
  type RideRules,
} from '@kmlegal/finance';
import { registrarAvaliacao } from '@/lib/corridas/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, Campo } from '@/components/formulario';

/**
 * A pergunta de três segundos.
 *
 * O veredito aparece enquanto o motorista digita, com a mesma função que o
 * servidor usa ao registrar. Na prática, o número que ele vê para decidir é o
 * mesmo que fica no histórico.
 */
export function Analisador({
  regras,
  custoPorKm,
  semRegras,
}: {
  regras: RideRules;
  custoPorKm: number | null;
  semRegras: boolean;
}) {
  const registrada = useSearchParams().get('registrada') === '1';
  const [estado, acao] = useActionState(registrarAvaliacao, {});
  const [v, setV] = useState({
    valor: '',
    km_busca: '',
    km_viagem: '',
    min_busca: '',
    min_viagem: '',
    nota_passageiro: '',
  });

  const set = (k: keyof typeof v, valor: string) => setV((a) => ({ ...a, [k]: valor }));

  const avaliacao = useMemo(() => {
    const valor = lerNumeroBR(v.valor);
    const kmViagem = lerNumeroBR(v.km_viagem);
    if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(kmViagem) || kmViagem <= 0) {
      return null;
    }

    const num = (s: string) => {
      const n = lerNumeroBR(s);
      return Number.isFinite(n) ? n : 0;
    };

    return avaliarCorrida(
      {
        valor,
        kmBusca: num(v.km_busca),
        kmViagem,
        minBusca: num(v.min_busca),
        minViagem: num(v.min_viagem),
        notaPassageiro: v.nota_passageiro ? lerNumeroBR(v.nota_passageiro) : null,
      },
      regras,
      custoPorKm,
    );
  }, [v, regras, custoPorKm]);

  const minimo = useMemo(() => {
    if (!avaliacao) return null;
    return valorMinimoAceitavel(avaliacao.kmTotal, avaliacao.minutosTotal, regras, custoPorKm);
  }, [avaliacao, regras, custoPorKm]);

  const aceitar = avaliacao?.veredito === 'aceitar';
  const recusar = avaliacao?.veredito === 'recusar';

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="custo_por_km" value={custoPorKm ?? ''} />
      {registrada && <Aviso tipo="sucesso">Corrida registrada.</Aviso>}
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <Campo
        label="Valor da corrida"
        name="valor"
        inputMode="decimal"
        placeholder="18,50"
        autoFocus
        required
        value={v.valor}
        onChange={(e) => set('valor', e.target.value)}
        erro={estado.campos?.valor}
      />

      <div className="grid grid-cols-2 gap-3">
        <Campo
          label="KM até o passageiro"
          name="km_busca"
          inputMode="decimal"
          placeholder="2"
          value={v.km_busca}
          onChange={(e) => set('km_busca', e.target.value)}
          erro={estado.campos?.km_busca}
        />
        <Campo
          label="KM da viagem"
          name="km_viagem"
          inputMode="decimal"
          placeholder="8"
          required
          value={v.km_viagem}
          onChange={(e) => set('km_viagem', e.target.value)}
          erro={estado.campos?.km_viagem}
        />
        <Campo
          label="Min até o passageiro"
          name="min_busca"
          inputMode="numeric"
          placeholder="5"
          value={v.min_busca}
          onChange={(e) => set('min_busca', e.target.value)}
          erro={estado.campos?.min_busca}
        />
        <Campo
          label="Min da viagem"
          name="min_viagem"
          inputMode="numeric"
          placeholder="15"
          value={v.min_viagem}
          onChange={(e) => set('min_viagem', e.target.value)}
          erro={estado.campos?.min_viagem}
        />
      </div>

      <Campo
        label="Nota do passageiro (opcional)"
        name="nota_passageiro"
        inputMode="decimal"
        placeholder="4,9"
        value={v.nota_passageiro}
        onChange={(e) => set('nota_passageiro', e.target.value)}
        erro={estado.campos?.nota_passageiro}
      />

      {avaliacao && (
        <>
          <div
            className="mb-4 rounded-[var(--radius-cartao)] border-2 p-5 text-center"
            style={{
              borderColor: aceitar
                ? 'var(--color-positivo)'
                : recusar
                  ? 'var(--color-alerta)'
                  : 'var(--color-borda)',
            }}
          >
            <p
              className="text-3xl font-bold"
              style={{
                color: aceitar
                  ? 'var(--color-positivo)'
                  : recusar
                    ? 'var(--color-alerta)'
                    : undefined,
              }}
            >
              {aceitar ? 'ACEITAR' : recusar ? 'RECUSAR' : 'Sem regras para julgar'}
            </p>

            {avaliacao.motivos.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-sm text-[var(--color-tinta-suave)]">
                {avaliacao.motivos.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}

            {aceitar && minimo !== null && (
              <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">
                Nesta distância, o mínimo aceitável seria {formatMoney(minimo)}.
              </p>
            )}
          </div>

          <dl className="mb-4 divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)] text-sm">
            <Linha rotulo="KM total" valor={`${formatNumber(avaliacao.kmTotal, 1)} km`} />
            <Linha rotulo="R$ por km" valor={formatRate(avaliacao.rsKm, 'km')} />
            <Linha rotulo="R$ por hora" valor={formatRate(avaliacao.rsHora, 'h')} />
            <Linha rotulo="Custo estimado" valor={formatMoney(avaliacao.custoEstimado)} />
            <Linha
              rotulo="Margem estimada"
              valor={formatMoney(avaliacao.margemEstimada)}
              alerta={(avaliacao.margemEstimada ?? 0) < 0}
            />
            {avaliacao.proporcaoBusca !== null && avaliacao.proporcaoBusca > 30 && (
              <Linha
                rotulo="Rodando sem passageiro"
                valor={`${formatNumber(avaliacao.proporcaoBusca, 0)}%`}
                alerta={avaliacao.proporcaoBusca > 40}
              />
            )}
          </dl>

          <label className="mb-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="aceita"
              className="size-5 shrink-0 accent-[var(--color-marca)]"
            />
            <span>Eu aceitei esta corrida</span>
          </label>

          <button
            type="submit"
            className="w-full rounded-full border border-[var(--color-borda)] px-6 py-3 font-semibold"
          >
            Guardar no histórico
          </button>
        </>
      )}

      {semRegras && (
        <p className="mt-4 text-sm text-[var(--color-tinta-suave)]">
          Sem regras cadastradas, o app só reprova corrida que dá prejuízo.{' '}
          <a href="/app/corrida/regras" className="text-[var(--color-marca)]">
            Defina seus mínimos
          </a>{' '}
          para ter um veredito de verdade.
        </p>
      )}
    </form>
  );
}

function Linha({
  rotulo,
  valor,
  alerta,
}: {
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 px-4 py-2.5">
      <dt className="text-[var(--color-tinta-suave)]">{rotulo}</dt>
      <dd
        className="tabular shrink-0 font-medium"
        style={alerta ? { color: 'var(--color-alerta)' } : undefined}
      >
        {valor}
      </dd>
    </div>
  );
}
