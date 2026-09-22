'use client';

import { useActionState } from 'react';
import { salvarLimites, salvarPlano } from '@/lib/admin/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

interface Plano {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  trial_days: string;
}

interface Limite {
  feature_key: string;
  rotulo: string;
  unidade: string;
  enabled: boolean;
  limite: string;
}

export function EditorPlano({ plano, limites }: { plano: Plano; limites: Limite[] }) {
  const [estadoPlano, acaoPlano] = useActionState(salvarPlano, {});
  const [estadoLimites, acaoLimites] = useActionState(salvarLimites, {});

  return (
    <section className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-5">
      <h2 className="mb-4 text-lg font-semibold">
        {plano.name}
        <span className="ml-2 text-sm font-normal text-[var(--color-tinta-suave)]">
          {plano.code}
        </span>
      </h2>

      <form action={acaoPlano} noValidate className="mb-6">
        <input type="hidden" name="plan_id" value={plano.id} />
        {estadoPlano.erro && <Aviso tipo="erro">{estadoPlano.erro}</Aviso>}
        {estadoPlano.sucesso && <Aviso tipo="sucesso">{estadoPlano.sucesso}</Aviso>}

        <Campo
          label="Nome"
          name="name"
          defaultValue={plano.name}
          required
          erro={estadoPlano.campos?.name}
        />
        <Campo
          label="Descrição"
          name="description"
          defaultValue={plano.description}
          erro={estadoPlano.campos?.description}
        />

        <div className="grid grid-cols-3 gap-3">
          <Campo
            label="Mensal"
            name="price_monthly"
            inputMode="decimal"
            defaultValue={plano.price_monthly}
            erro={estadoPlano.campos?.price_monthly}
          />
          <Campo
            label="Anual"
            name="price_yearly"
            inputMode="decimal"
            defaultValue={plano.price_yearly}
            erro={estadoPlano.campos?.price_yearly}
          />
          <Campo
            label="Teste (dias)"
            name="trial_days"
            inputMode="numeric"
            defaultValue={plano.trial_days}
            erro={estadoPlano.campos?.trial_days}
          />
        </div>

        <BotaoEnviar>Salvar plano</BotaoEnviar>
      </form>

      <form action={acaoLimites} noValidate className="border-t border-[var(--color-borda)] pt-5">
        <input type="hidden" name="plan_id" value={plano.id} />
        {estadoLimites.erro && <Aviso tipo="erro">{estadoLimites.erro}</Aviso>}
        {estadoLimites.sucesso && <Aviso tipo="sucesso">{estadoLimites.sucesso}</Aviso>}

        <h3 className="mb-1 font-medium">Limites</h3>
        <p className="mb-3 text-sm text-[var(--color-tinta-suave)]">
          Campo de limite em branco significa <strong>ilimitado</strong>, não zero.
        </p>

        <ul className="mb-4 divide-y divide-[var(--color-borda)]">
          {limites.map((l) => (
            <li key={l.feature_key} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                name={`enabled_${l.feature_key}`}
                defaultChecked={l.enabled}
                aria-label={`${l.rotulo} liberado`}
                className="size-5 shrink-0 accent-[var(--color-marca)]"
              />
              <span className="min-w-0 flex-1 text-sm">{l.rotulo}</span>
              {l.unidade ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <input
                    name={`limite_${l.feature_key}`}
                    defaultValue={l.limite}
                    inputMode="decimal"
                    placeholder="∞"
                    aria-label={`Limite de ${l.rotulo}`}
                    className="tabular w-20 rounded-lg border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-2 py-1.5 text-center text-sm"
                  />
                  <span className="w-10 text-xs text-[var(--color-tinta-suave)]">{l.unidade}</span>
                </span>
              ) : (
                <span className="w-[7.5rem] shrink-0" />
              )}
            </li>
          ))}
        </ul>

        <BotaoEnviar>Salvar limites</BotaoEnviar>
      </form>
    </section>
  );
}
