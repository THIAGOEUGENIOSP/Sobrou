import Link from 'next/link';
import {
  consumoPorTanque,
  consumoReal,
  formatConsumo,
  formatKm,
  formatLitros,
  formatMoney,
  formatRate,
  precoReferencia,
} from '@kmlegal/finance';
import { carregarContexto, paraFuelEntry } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { historyFloor } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Abastecimentos — KM Legal' };

const NOME_COMBUSTIVEL: Record<string, string> = {
  etanol: 'Etanol',
  gasolina: 'Gasolina',
  gnv: 'GNV',
  diesel: 'Diesel',
  outro: 'Outro',
};

export default async function AbastecimentosPage() {
  const ctx = await carregarContexto();
  const supabase = await createClient();

  // O limite de histórico do plano é aplicado aqui, na query — não no botão.
  const piso = await historyFloor();
  let query = supabase.from('fuel_entries').select('*').order('filled_at', { ascending: false });
  if (piso) query = query.gte('filled_at', piso.toISOString());

  const { data: linhas } = await query;
  const entradas = (linhas ?? []).map(paraFuelEntry);

  const medido = consumoReal(ctx.abastecimentos);
  const trechos = consumoPorTanque(ctx.abastecimentos);
  const ultimoTrecho = trechos.at(-1);
  const precoAtual = precoReferencia(ctx.abastecimentos, {
    modo: ctx.settings?.fuel_price_mode ?? 'ultimo',
    cashbackAbateCusto: ctx.settings?.cashback_reduces_cost ?? true,
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Abastecimentos</h1>
        <Link
          href="/app/abastecimentos/novo"
          className="shrink-0 rounded-full bg-[var(--color-marca)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          + Novo
        </Link>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4">
          <p className="text-sm text-[var(--color-tinta-suave)]">Consumo real</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatConsumo(medido)}</p>
          <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
            {medido === null
              ? 'Precisa de dois tanques cheios com hodômetro.'
              : `Medido em ${trechos.length} ${trechos.length === 1 ? 'trecho' : 'trechos'}.`}
          </p>
        </div>
        <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4">
          <p className="text-sm text-[var(--color-tinta-suave)]">Preço de referência</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatRate(precoAtual, 'L')}</p>
          <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
            {ctx.settings?.fuel_price_mode === 'media_ponderada_30d'
              ? 'Média ponderada dos últimos 30 dias.'
              : 'Último abastecimento.'}
          </p>
        </div>
      </section>

      <Link
        href="/app/combustivel"
        className="mb-8 flex items-center justify-between gap-3 rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4"
      >
        <span>
          <span className="block font-medium">Etanol ou gasolina?</span>
          <span className="block text-sm text-[var(--color-tinta-suave)]">
            Compare pelo consumo real do seu carro.
          </span>
        </span>
        <span aria-hidden className="text-[var(--color-marca)]">
          →
        </span>
      </Link>

      {ultimoTrecho && (
        <section className="mb-8 rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4">
          <h2 className="mb-1 font-semibold">Último trecho medido</h2>
          <p className="text-sm text-[var(--color-tinta-suave)]">
            {formatKm(ultimoTrecho.km)} com {formatLitros(ultimoTrecho.litros)} —{' '}
            <strong className="text-[var(--color-tinta)]">
              {formatConsumo(ultimoTrecho.consumo)}
            </strong>
            {ultimoTrecho.fuelKind && ` no ${NOME_COMBUSTIVEL[ultimoTrecho.fuelKind]?.toLowerCase()}`}.
          </p>
        </section>
      )}

      {entradas.length === 0 ? (
        <div className="rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nenhum abastecimento registrado.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Registre dois tanques cheios com o hodômetro e o app passa a usar o consumo real do seu
            carro no lugar da estimativa.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          {(linhas ?? []).map((linha) => (
            <li key={linha.id}>
              <Link href={`/app/abastecimentos/${linha.id}`} className="block px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {NOME_COMBUSTIVEL[linha.fuel_kind] ?? linha.fuel_kind}
                    {linha.tanque_cheio && (
                      <span className="ml-2 text-xs text-[var(--color-marca)]">tanque cheio</span>
                    )}
                  </span>
                  <span className="tabular shrink-0 font-semibold">
                    {formatMoney(Number(linha.valor_pago))}
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-3 text-sm text-[var(--color-tinta-suave)]">
                  <span>
                    {new Date(linha.filled_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                    {linha.station && ` · ${linha.station}`}
                  </span>
                  <span className="tabular shrink-0">
                    {formatLitros(Number(linha.litros))} ·{' '}
                    {formatRate(Number(linha.preco_real_litro), 'L')}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {piso && (
        <p className="mt-4 text-xs text-[var(--color-tinta-suave)]">
          Seu plano mostra os abastecimentos a partir de{' '}
          {piso.toLocaleDateString('pt-BR')}. Os registros anteriores continuam guardados e entram na
          exportação dos seus dados.
        </p>
      )}
    </>
  );
}
