'use client';

import { useActionState, useState } from 'react';
import type { AllocationConfig } from '@kmlegal/finance';
import { salvarAjustes, salvarPercentuais } from '@/lib/ajustes/actions';
import { Aviso, BotaoEnviar } from '@/components/formulario';

export function FormularioPercentuais({ atual }: { atual: AllocationConfig }) {
  const [estado, acao] = useActionState(salvarPercentuais, {});
  const [pct, setPct] = useState({
    disponivel: String(atual.pctDisponivel),
    emergencia: String(atual.pctEmergencia),
    veiculo: String(atual.pctVeiculo),
  });

  const soma = Number(pct.disponivel || 0) + Number(pct.emergencia || 0) + Number(pct.veiculo || 0);
  const fecha = Math.abs(soma - 100) < 0.005;

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ['disponivel', 'pct_disponivel', 'Para você'],
            ['emergencia', 'pct_emergencia', 'Emergência'],
            ['veiculo', 'pct_veiculo', 'Carro'],
          ] as const
        ).map(([chave, name, rotulo]) => (
          <label key={name} className="block">
            <span className="mb-1 block text-sm font-medium">{rotulo}</span>
            <input
              name={name}
              inputMode="decimal"
              value={pct[chave]}
              onChange={(e) => setPct({ ...pct, [chave]: e.target.value })}
              className="tabular w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-3 py-3 text-center text-base"
            />
          </label>
        ))}
      </div>

      <p
        className="mt-2 mb-4 text-sm"
        style={{ color: fecha ? 'var(--color-positivo)' : 'var(--color-alerta)' }}
      >
        {fecha ? 'Soma 100%.' : `Soma ${soma.toLocaleString('pt-BR')}%. Precisa fechar em 100%.`}
      </p>

      <BotaoEnviar>Salvar percentuais</BotaoEnviar>

      <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
        Vale dos próximos turnos em diante. Os dias já fechados guardam os percentuais que usaram.
      </p>
    </form>
  );
}

export function FormularioAjustes({
  fuelPriceMode,
  cashbackAbate,
  rideCostBasis,
  cards,
  podePersonalizar,
}: {
  fuelPriceMode: string;
  cashbackAbate: boolean;
  rideCostBasis: string;
  cards: Array<{ chave: string; rotulo: string; ativo: boolean }>;
  podePersonalizar: boolean;
}) {
  const [estado, acao] = useActionState(salvarAjustes, {});

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium">Preço do combustível nos cálculos</legend>
        <div className="grid gap-2">
          <Opcao
            name="fuel_price_mode"
            value="ultimo"
            defaultChecked={fuelPriceMode === 'ultimo'}
            titulo="Último abastecimento"
            descricao="Acompanha a bomba de perto. Bom para quem abastece com frequência."
          />
          <Opcao
            name="fuel_price_mode"
            value="media_ponderada_30d"
            defaultChecked={fuelPriceMode === 'media_ponderada_30d'}
            titulo="Média ponderada de 30 dias"
            descricao="Suaviza a oscilação do posto. Bom quando o preço varia muito."
          />
        </div>
      </fieldset>

      <label className="mb-6 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="cashback_reduces_cost"
          defaultChecked={cashbackAbate}
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-marca)]"
        />
        <span>
          Cashback abate o custo do combustível
          <span className="block text-xs text-[var(--color-tinta-suave)]">
            Desmarque se o cashback só cai semanas depois — abater no dia distorce o custo daquele
            dia, e é melhor tratá-lo como receita à parte.
          </span>
        </span>
      </label>

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium">Custo usado no analisador de corridas</legend>
        <div className="grid gap-2">
          <Opcao
            name="ride_cost_basis"
            value="total"
            defaultChecked={rideCostBasis === 'total'}
            titulo="Custo total por km"
            descricao="Inclui desgaste, depreciação e seguro. É a conta honesta do que a corrida custa."
          />
          <Opcao
            name="ride_cost_basis"
            value="combustivel"
            defaultChecked={rideCostBasis === 'combustivel'}
            titulo="Só o combustível"
            descricao="Visão de caixa do dia: quanto sai do bolso agora."
          />
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium">
          Cards do dashboard
          {!podePersonalizar && (
            <span className="ml-2 text-xs font-normal text-[var(--color-tinta-suave)]">
              disponível no Premium
            </span>
          )}
        </legend>
        <div className="grid gap-1.5">
          {cards.map((c) => (
            <label key={c.chave} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="cards"
                value={c.chave}
                defaultChecked={c.ativo}
                disabled={!podePersonalizar}
                className="size-5 shrink-0 accent-[var(--color-marca)] disabled:opacity-40"
              />
              <span style={{ opacity: podePersonalizar ? 1 : 0.5 }}>{c.rotulo}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <BotaoEnviar>Salvar ajustes</BotaoEnviar>
    </form>
  );
}

function Opcao({
  name,
  value,
  defaultChecked,
  titulo,
  descricao,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  titulo: string;
  descricao: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-borda)] p-3">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-[var(--color-marca)]"
      />
      <span>
        <span className="block font-medium">{titulo}</span>
        <span className="block text-xs text-[var(--color-tinta-suave)]">{descricao}</span>
      </span>
    </label>
  );
}
