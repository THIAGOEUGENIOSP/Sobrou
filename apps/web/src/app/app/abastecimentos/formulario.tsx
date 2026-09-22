'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { formatMoney, formatRate, precoRealLitro } from '@kmlegal/finance';
import { salvarAbastecimento } from '@/lib/abastecimentos/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

type Veiculo = { id: string; nickname: string };

export interface ValoresAbastecimento {
  id?: string;
  vehicle_id: string;
  data: string;
  hora: string;
  posto: string;
  fuel_kind: string;
  preco_anunciado: string;
  litros: string;
  valor_bruto: string;
  desconto: string;
  cashback: string;
  valor_pago: string;
  odometro: string;
  tanque_cheio: boolean;
  notes: string;
}

const COMBUSTIVEIS = [
  ['etanol', 'Etanol'],
  ['gasolina', 'Gasolina'],
  ['gnv', 'GNV'],
  ['diesel', 'Diesel'],
  ['outro', 'Outro'],
] as const;

export function FormularioAbastecimento({
  veiculos,
  valores,
  edicao,
}: {
  veiculos: Veiculo[];
  valores: ValoresAbastecimento;
  edicao?: boolean;
}) {
  const [estado, acao] = useActionState(salvarAbastecimento, {});
  const [v, setV] = useState(valores);

  const set = (campo: keyof ValoresAbastecimento, valor: string | boolean) =>
    setV((atual) => ({ ...atual, [campo]: valor }));

  /**
   * Cálculo ao vivo enquanto o motorista digita.
   *
   * O bruto é sugerido a partir de preço × litros, e o pago já desconta o
   * desconto — mas os dois continuam editáveis, porque a bomba às vezes
   * arredonda e o que vale é o que apareceu na maquininha.
   */
  function aoMudarLitros(texto: string) {
    const litros = lerNumeroBR(texto);
    const preco = lerNumeroBR(v.preco_anunciado);
    setV((atual) => {
      const proximo = { ...atual, litros: texto };
      if (Number.isFinite(litros) && Number.isFinite(preco) && preco > 0) {
        const bruto = (litros * preco).toFixed(2).replace('.', ',');
        proximo.valor_bruto = bruto;
        proximo.valor_pago = aplicarDesconto(bruto, atual.desconto);
      }
      return proximo;
    });
  }

  function aoMudarBruto(texto: string) {
    setV((atual) => ({ ...atual, valor_bruto: texto, valor_pago: aplicarDesconto(texto, atual.desconto) }));
  }

  function aoMudarDesconto(texto: string) {
    setV((atual) => ({ ...atual, desconto: texto, valor_pago: aplicarDesconto(atual.valor_bruto, texto) }));
  }

  const previa = useMemo(() => {
    const litros = lerNumeroBR(v.litros);
    const pago = lerNumeroBR(v.valor_pago);
    if (!Number.isFinite(litros) || !Number.isFinite(pago)) return null;

    const real = precoRealLitro({ valorPago: pago, litros });
    const anunciado = lerNumeroBR(v.preco_anunciado);
    const economia = lerNumeroBR(v.desconto) + lerNumeroBR(v.cashback);

    return {
      real,
      anunciado: Number.isFinite(anunciado) ? anunciado : null,
      economia: Number.isFinite(economia) ? economia : 0,
    };
  }, [v.litros, v.valor_pago, v.preco_anunciado, v.desconto, v.cashback]);

  return (
    <form action={acao} noValidate>
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      {veiculos.length > 1 && (
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Veículo</span>
          <select
            name="vehicle_id"
            value={v.vehicle_id}
            onChange={(e) => set('vehicle_id', e.target.value)}
            className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
          >
            {veiculos.map((veic) => (
              <option key={veic.id} value={veic.id}>
                {veic.nickname}
              </option>
            ))}
          </select>
        </label>
      )}
      {veiculos.length <= 1 && <input type="hidden" name="vehicle_id" value={v.vehicle_id} />}

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium">Combustível</legend>
        <div className="flex flex-wrap gap-2">
          {COMBUSTIVEIS.map(([valor, rotulo]) => (
            <label
              key={valor}
              className="cursor-pointer rounded-full border px-4 py-2 text-sm"
              style={{
                borderColor: v.fuel_kind === valor ? 'var(--color-marca)' : 'var(--color-borda)',
                color: v.fuel_kind === valor ? 'var(--color-marca)' : undefined,
                fontWeight: v.fuel_kind === valor ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="fuel_kind"
                value={valor}
                checked={v.fuel_kind === valor}
                onChange={() => set('fuel_kind', valor)}
                className="sr-only"
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Campo
          label="Preço na placa"
          name="preco_anunciado"
          inputMode="decimal"
          placeholder="4,19"
          value={v.preco_anunciado}
          onChange={(e) => set('preco_anunciado', e.target.value)}
          erro={estado.campos?.preco_anunciado}
        />
        <Campo
          label="Litros"
          name="litros"
          inputMode="decimal"
          placeholder="34,71"
          required
          value={v.litros}
          onChange={(e) => aoMudarLitros(e.target.value)}
          erro={estado.campos?.litros}
        />
        <Campo
          label="Valor bruto"
          name="valor_bruto"
          inputMode="decimal"
          placeholder="145,43"
          required
          value={v.valor_bruto}
          onChange={(e) => aoMudarBruto(e.target.value)}
          erro={estado.campos?.valor_bruto}
        />
        <Campo
          label="Desconto"
          name="desconto"
          inputMode="decimal"
          placeholder="10,00"
          value={v.desconto}
          onChange={(e) => aoMudarDesconto(e.target.value)}
          erro={estado.campos?.desconto}
        />
        <Campo
          label="Cashback"
          name="cashback"
          inputMode="decimal"
          placeholder="0,00"
          value={v.cashback}
          onChange={(e) => set('cashback', e.target.value)}
          erro={estado.campos?.cashback}
        />
        <Campo
          label="Valor pago"
          name="valor_pago"
          inputMode="decimal"
          placeholder="135,43"
          required
          value={v.valor_pago}
          onChange={(e) => set('valor_pago', e.target.value)}
          erro={estado.campos?.valor_pago}
        />
      </div>

      {previa?.real != null && (
        <div className="mb-4 rounded-[var(--radius-cartao)] border border-[var(--color-marca)] p-4">
          <p className="text-sm text-[var(--color-tinta-suave)]">Preço real por litro</p>
          <p className="tabular text-2xl font-bold text-[var(--color-marca)]">
            {formatRate(previa.real, 'L')}
          </p>
          {previa.anunciado !== null && previa.economia > 0 && (
            <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
              Na placa era {formatRate(previa.anunciado, 'L')}. Você economizou{' '}
              {formatMoney(previa.economia)} neste abastecimento.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo
          label="Data"
          name="data"
          type="date"
          required
          value={v.data}
          onChange={(e) => set('data', e.target.value)}
          erro={estado.campos?.data}
        />
        <Campo
          label="Hora"
          name="hora"
          type="time"
          required
          value={v.hora}
          onChange={(e) => set('hora', e.target.value)}
          erro={estado.campos?.hora}
        />
      </div>

      <Campo
        label="Hodômetro"
        name="odometro"
        inputMode="decimal"
        placeholder="10000"
        value={v.odometro}
        onChange={(e) => set('odometro', e.target.value)}
        erro={estado.campos?.odometro}
      />

      <label className="mb-4 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="tanque_cheio"
          checked={v.tanque_cheio}
          onChange={(e) => set('tanque_cheio', e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-marca)]"
        />
        <span>
          Enchi o tanque
          <span className="block text-xs text-[var(--color-tinta-suave)]">
            Marcar aqui, com o hodômetro preenchido, é o que permite medir o consumo real do carro.
          </span>
        </span>
      </label>

      <Campo
        label="Posto (opcional)"
        name="posto"
        placeholder="Ipiranga da Marginal"
        value={v.posto}
        onChange={(e) => set('posto', e.target.value)}
        erro={estado.campos?.posto}
      />

      <BotaoEnviar>{edicao ? 'Salvar alterações' : 'Registrar abastecimento'}</BotaoEnviar>

      <Link
        href="/app/abastecimentos"
        className="mt-3 block w-full py-3 text-center text-sm text-[var(--color-tinta-suave)]"
      >
        Cancelar
      </Link>
    </form>
  );
}

function aplicarDesconto(bruto: string, desconto: string): string {
  const b = lerNumeroBR(bruto);
  const d = lerNumeroBR(desconto);
  if (!Number.isFinite(b)) return bruto;
  const pago = Math.max(b - (Number.isFinite(d) ? d : 0), 0);
  return pago.toFixed(2).replace('.', ',');
}
