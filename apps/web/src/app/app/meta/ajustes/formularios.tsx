'use client';

import { useActionState, useEffect, useState } from 'react';
import { salvarConfigMeta } from '@/lib/meta/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';
import { NOMES_DIAS } from '../ui';

export interface ValoresConfig {
  dias: number[];
  rs_h_vermelho: number;
  rs_h_verde: number;
  rs_km_vermelho: number;
  rs_km_verde: number;
  liq_h_vermelho: number;
  liq_h_verde: number;
  custo_manutencao_km: number | null;
  custo_pneus_km: number;
  custo_revisao_km: number;
  custo_outros_km: number;
}

const br = (v: number | null, casas = 2) =>
  v === null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: 4 });

// Seg → Dom, que é como o motorista lê a semana.
const ORDEM = [1, 2, 3, 4, 5, 6, 0];

export function FormularioConfig({ v, manutencaoVeiculo }: { v: ValoresConfig; manutencaoVeiculo: number | null }) {
  const [estado, acao] = useActionState(salvarConfigMeta, {});
  const [dias, setDias] = useState(new Set(v.dias));
  const e = estado.campos ?? {};

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}

      <section className="cartao mb-4 p-5" id="dias">
        <h2 className="mb-1 font-semibold">Dias que pretendo trabalhar</h2>
        <p className="mb-3 text-xs text-[var(--color-tinta-suave)]">O que falta da meta é dividido entre estes dias até o fim do mês.</p>
        <div className="flex flex-wrap gap-2">
          {ORDEM.map((d) => {
            const ativo = dias.has(d);
            return (
              <label
                key={d}
                className="flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold"
                style={
                  ativo
                    ? { background: 'var(--color-marca-suave)', borderColor: 'var(--color-marca)', color: 'var(--color-marca)' }
                    : { borderColor: 'var(--color-borda)', color: 'var(--color-tinta-suave)' }
                }
              >
                <input
                  type="checkbox"
                  name="dias"
                  value={d}
                  checked={ativo}
                  onChange={() => {
                    const n = new Set(dias);
                    if (n.has(d)) n.delete(d);
                    else n.add(d);
                    setDias(n);
                  }}
                  className="sr-only"
                />
                {NOMES_DIAS[d]}
              </label>
            );
          })}
        </div>
        {e.dias && <p className="mt-2 text-sm text-[var(--color-alerta)]">{e.dias}</p>}
      </section>

      <section className="cartao mb-4 p-5" id="farois">
        <h2 className="mb-1 font-semibold">Indicadores 🟢 🟡 🔴</h2>
        <p className="mb-3 text-xs text-[var(--color-tinta-suave)]">
          Abaixo do vermelho = 🔴 · entre os dois = 🟡 · acima do verde = 🟢
        </p>
        {(
          [
            ['R$/hora', 'rs_h', v.rs_h_vermelho, v.rs_h_verde, 2],
            ['R$/km', 'rs_km', v.rs_km_vermelho, v.rs_km_verde, 2],
            ['Lucro por hora', 'liq_h', v.liq_h_vermelho, v.liq_h_verde, 2],
          ] as const
        ).map(([rotulo, k, verm, verde, casas]) => (
          <fieldset key={k} className="mb-1">
            <legend className="mb-1 text-sm font-medium">{rotulo}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="🔴 abaixo de" name={`${k}_vermelho`} inputMode="decimal" defaultValue={br(verm, casas)} erro={e[`${k}_vermelho`]} />
              <Campo label="🟢 acima de" name={`${k}_verde`} inputMode="decimal" defaultValue={br(verde, casas)} erro={e[`${k}_verde`]} />
            </div>
          </fieldset>
        ))}
      </section>

      <section className="cartao mb-4 p-5" id="custos">
        <h2 className="mb-1 font-semibold">Custos por km (lucro real)</h2>
        <p className="mb-3 text-xs text-[var(--color-tinta-suave)]">
          Combustível já entra pelo seu consumo e pelo preço pago nos abastecimentos. Aqui vão os outros custos de rodar,
          em R$ por km.
        </p>
        <Campo
          label="Manutenção (R$/km)"
          name="custo_manutencao_km"
          inputMode="decimal"
          placeholder={manutencaoVeiculo !== null ? `${br(manutencaoVeiculo)} (do veículo)` : '0,10'}
          defaultValue={br(v.custo_manutencao_km)}
          erro={e.custo_manutencao_km}
        />
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Pneus" name="custo_pneus_km" inputMode="decimal" defaultValue={br(v.custo_pneus_km)} erro={e.custo_pneus_km} />
          <Campo label="Revisão" name="custo_revisao_km" inputMode="decimal" defaultValue={br(v.custo_revisao_km)} erro={e.custo_revisao_km} />
          <Campo label="Outros" name="custo_outros_km" inputMode="decimal" defaultValue={br(v.custo_outros_km)} erro={e.custo_outros_km} />
        </div>
        <p className="-mt-2 text-xs text-[var(--color-tinta-suave)]">
          Exemplo: jogo de pneus de R$ 1.600 que dura 40.000 km = 0,04 por km.
        </p>
      </section>

      <BotaoEnviar>Salvar configurações</BotaoEnviar>
    </form>
  );
}

type Tema = 'escuro' | 'claro' | 'sistema';

export function SeletorTema() {
  const [tema, setTema] = useState<Tema>('escuro');
  useEffect(() => {
    try {
      setTema((localStorage.getItem('sobrou-tema') as Tema | null) ?? 'escuro');
    } catch {
      /* armazenamento bloqueado: fica no escuro */
    }
  }, []);

  function escolher(t: Tema) {
    setTema(t);
    try {
      localStorage.setItem('sobrou-tema', t);
    } catch {
      /* ignora */
    }
    const claro = t === 'claro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: light)').matches);
    if (claro) document.documentElement.dataset.tema = 'claro';
    else delete document.documentElement.dataset.tema;
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: 'var(--color-papel-suave)' }}>
      {(
        [
          ['escuro', 'Escuro'],
          ['claro', 'Claro'],
          ['sistema', 'Do celular'],
        ] as const
      ).map(([t, r]) => (
        <button
          key={t}
          type="button"
          onClick={() => escolher(t)}
          aria-pressed={tema === t}
          className="rounded-lg py-2 text-sm font-semibold"
          style={tema === t ? { background: 'var(--color-papel-elevado)' } : { color: 'var(--color-tinta-suave)' }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
