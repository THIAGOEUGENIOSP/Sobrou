'use client';

import { useMemo, useState } from 'react';
import { compararCombustiveis, formatConsumo, formatNumber, formatRate } from '@kmlegal/finance';
import { lerNumeroBR } from '@/lib/numeros';

function texto(v: number | null): string {
  return v === null || !Number.isFinite(v) ? '' : String(v).replace('.', ',');
}

export function Comparador({
  consumoEtanol,
  consumoGasolina,
  etanolMedido,
  gasolinaMedida,
  precoEtanol,
  precoGasolina,
}: {
  consumoEtanol: number | null;
  consumoGasolina: number | null;
  etanolMedido: boolean;
  gasolinaMedida: boolean;
  precoEtanol: number | null;
  precoGasolina: number | null;
}) {
  const [v, setV] = useState({
    consumoEtanol: texto(consumoEtanol),
    consumoGasolina: texto(consumoGasolina),
    precoEtanol: texto(precoEtanol),
    precoGasolina: texto(precoGasolina),
  });

  const resultado = useMemo(() => {
    const ce = lerNumeroBR(v.consumoEtanol);
    const cg = lerNumeroBR(v.consumoGasolina);
    const pe = lerNumeroBR(v.precoEtanol);
    const pg = lerNumeroBR(v.precoGasolina);

    const opcoes = [];
    if (Number.isFinite(ce) && ce > 0 && Number.isFinite(pe) && pe > 0) {
      opcoes.push({ fuelKind: 'etanol' as const, preco: pe, consumo: ce });
    }
    if (Number.isFinite(cg) && cg > 0 && Number.isFinite(pg) && pg > 0) {
      opcoes.push({ fuelKind: 'gasolina' as const, preco: pg, consumo: cg });
    }
    return opcoes.length === 2 ? compararCombustiveis(opcoes) : null;
  }, [v]);

  const campo = (
    rotulo: string,
    chave: keyof typeof v,
    placeholder: string,
    medido?: boolean,
  ) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {rotulo}
        {medido && <span className="ml-1 text-xs text-[var(--color-marca)]">medido</span>}
      </span>
      <input
        inputMode="decimal"
        placeholder={placeholder}
        value={v[chave]}
        onChange={(e) => setV({ ...v, [chave]: e.target.value })}
        className="tabular w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
      />
    </label>
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {campo('Consumo etanol', 'consumoEtanol', '9,6', etanolMedido)}
        {campo('Consumo gasolina', 'consumoGasolina', '13,5', gasolinaMedida)}
        {campo('Preço do etanol', 'precoEtanol', '3,90')}
        {campo('Preço da gasolina', 'precoGasolina', '5,60')}
      </div>

      {resultado?.vencedor ? (
        <>
          <div className="mb-4 rounded-[var(--radius-cartao)] border border-[var(--color-marca)] p-5 text-center">
            <p className="text-sm text-[var(--color-tinta-suave)]">Hoje compensa abastecer com</p>
            <p className="mt-1 text-3xl font-bold text-[var(--color-marca)]">
              {resultado.vencedor === 'etanol' ? 'Etanol' : 'Gasolina'}
            </p>
            {resultado.economiaPorKm !== null && resultado.economiaPorKm > 0 && (
              <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                Economia de {formatRate(resultado.economiaPorKm, 'km')} — a cada 1.000 km, isso dá{' '}
                {formatNumber(resultado.economiaPorKm * 1000)} reais.
              </p>
            )}
          </div>

          <ul className="mb-4 divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
            {resultado.opcoes.map((o) => (
              <li key={o.fuelKind} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span>
                  <span className="font-medium">
                    {o.fuelKind === 'etanol' ? 'Etanol' : 'Gasolina'}
                  </span>
                  <span className="ml-2 text-sm text-[var(--color-tinta-suave)]">
                    {formatRate(o.preco, 'L')} · {formatConsumo(o.consumo)}
                  </span>
                </span>
                <span
                  className="tabular shrink-0 font-semibold"
                  style={{
                    color:
                      o.fuelKind === resultado.vencedor ? 'var(--color-marca)' : undefined,
                  }}
                >
                  {formatRate(o.custoPorKm, 'km')}
                </span>
              </li>
            ))}
          </ul>

          {resultado.paridadeReal !== null && (
            <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4">
              <h2 className="mb-1 font-semibold">A paridade do seu carro</h2>
              <p className="text-sm text-[var(--color-tinta-suave)]">
                O seu carro roda{' '}
                <strong className="text-[var(--color-tinta)]">
                  {formatNumber(resultado.paridadeReal * 100, 1)}%
                </strong>{' '}
                do que faz na gasolina quando anda com etanol. O etanol compensa enquanto custar
                menos que essa fração do preço da gasolina — e não os 70% da regra de bolso.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--color-tinta-suave)]">
          Preencha consumo e preço dos dois combustíveis para comparar.
        </p>
      )}
    </>
  );
}
