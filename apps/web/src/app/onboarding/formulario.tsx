'use client';

import { useActionState, useState } from 'react';
import { concluirOnboarding } from '@/lib/onboarding/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

type Template = { id: string; code: string; name: string; description: string | null };

export function FormularioOnboarding({ templates }: { templates: Template[] }) {
  const [estado, acao] = useActionState(concluirOnboarding, {});
  const [escolhido, setEscolhido] = useState(
    templates.find((t) => t.code === 'motorista_app')?.id ?? templates[0]?.id ?? '',
  );

  // Padrão sugerido da seção 7. Editável: o usuário muda à vontade,
  // desde que a soma feche em 100.
  const [pct, setPct] = useState({ disponivel: '70', emergencia: '10', veiculo: '20' });
  const soma =
    Number(pct.disponivel || 0) + Number(pct.emergencia || 0) + Number(pct.veiculo || 0);

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold">1. O que você faz</legend>
        <div className="grid gap-2">
          {templates.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
              style={{
                borderColor:
                  escolhido === t.id ? 'var(--color-marca)' : 'var(--color-borda)',
              }}
            >
              <input
                type="radio"
                name="template_id"
                value={t.id}
                checked={escolhido === t.id}
                onChange={() => setEscolhido(t.id)}
                className="mt-1 size-5 shrink-0 accent-[var(--color-marca)]"
              />
              <span>
                <span className="block font-medium">{t.name}</span>
                {t.description && (
                  <span className="block text-sm text-[var(--color-tinta-suave)]">
                    {t.description}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        {estado.campos?.template_id && (
          <p className="mt-1 text-sm text-[var(--color-alerta)]">{estado.campos.template_id}</p>
        )}
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold">2. Seu veículo</legend>
        <Campo
          label="Como você chama ele"
          name="apelido"
          placeholder="Polo"
          required
          erro={estado.campos?.apelido}
        />
        <Campo
          label="Marca e modelo (opcional)"
          name="modelo"
          placeholder="VW Polo 170 TSI"
          erro={estado.campos?.modelo}
        />
        <Campo
          label="Consumo médio (km/L)"
          name="consumo"
          inputMode="decimal"
          placeholder="9,6"
          required
          erro={estado.campos?.consumo}
        />
        <p className="-mt-2 mb-4 text-sm text-[var(--color-tinta-suave)]">
          Um valor aproximado já serve. Assim que você registrar dois tanques cheios, o app passa
          a usar o consumo real medido.
        </p>
        <Campo
          label="Hodômetro hoje (opcional)"
          name="odometro"
          inputMode="decimal"
          placeholder="10000"
          erro={estado.campos?.odometro}
        />
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-1 font-semibold">3. Como dividir o que sobra</legend>
        <p className="mb-3 text-sm text-[var(--color-tinta-suave)]">
          Depois de descontar combustível e despesas, o resultado é dividido assim.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['disponivel', 'pct_disponivel', 'Para você'],
              ['emergencia', 'pct_emergencia', 'Emergência'],
              ['veiculo', 'pct_veiculo', 'Carro'],
            ] as const
          ).map(([chave, name, label]) => (
            <label key={name} className="block">
              <span className="mb-1 block text-sm font-medium">{label}</span>
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
          className="mt-2 text-sm"
          style={{
            color:
              Math.abs(soma - 100) < 0.005 ? 'var(--color-positivo)' : 'var(--color-alerta)',
          }}
        >
          {Math.abs(soma - 100) < 0.005
            ? 'Soma 100%. '
            : `Soma ${soma.toLocaleString('pt-BR')}%. Precisa fechar em 100%.`}
          {Math.abs(soma - 100) < 0.005 &&
            'A reserva do carro paga manutenção, pneu e a troca futura do veículo.'}
        </p>
        {estado.campos?.pct_disponivel && (
          <p className="mt-1 text-sm text-[var(--color-alerta)]">{estado.campos.pct_disponivel}</p>
        )}
      </fieldset>

      <BotaoEnviar>Começar a usar</BotaoEnviar>
    </form>
  );
}
