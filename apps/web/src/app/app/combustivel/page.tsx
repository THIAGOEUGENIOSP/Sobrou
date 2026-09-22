import Link from 'next/link';
import { consumoReal, precoReferencia } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { Comparador } from './comparador';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Etanol × gasolina — Sobrou' };

/**
 * Comparador de combustível (seção 16).
 *
 * A regra dos 70% é um atalho que serve para "um carro médio". O Sobrou já
 * sabe o consumo real DESTE carro em cada combustível, então compara custo por
 * km de verdade — e mostra qual é a paridade do carro do motorista.
 */
export default async function CombustivelPage() {
  const ctx = await carregarContexto();

  const etanolMedido = consumoReal(ctx.abastecimentos, { fuelKind: 'etanol' });
  const gasolinaMedida = consumoReal(ctx.abastecimentos, { fuelKind: 'gasolina' });

  const precoEtanol = precoReferencia(ctx.abastecimentos, {
    modo: 'ultimo',
    fuelKind: 'etanol',
    cashbackAbateCusto: ctx.settings?.cashback_reduces_cost ?? true,
  });
  const precoGasolina = precoReferencia(ctx.abastecimentos, {
    modo: 'ultimo',
    fuelKind: 'gasolina',
    cashbackAbateCusto: ctx.settings?.cashback_reduces_cost ?? true,
  });

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Etanol × gasolina</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Pelo consumo real do seu carro, não pela regra dos 70%.
      </p>

      <Comparador
        consumoEtanol={etanolMedido ?? Number(ctx.veiculo?.consumo_ref_etanol) ?? null}
        consumoGasolina={gasolinaMedida ?? Number(ctx.veiculo?.consumo_ref_gasolina) ?? null}
        etanolMedido={etanolMedido !== null}
        gasolinaMedida={gasolinaMedida !== null}
        precoEtanol={precoEtanol}
        precoGasolina={precoGasolina}
      />

      {(etanolMedido === null || gasolinaMedida === null) && (
        <p className="mt-6 text-sm text-[var(--color-tinta-suave)]">
          Para medir a paridade do seu carro, o app precisa de dois tanques cheios seguidos com{' '}
          <strong>cada</strong> combustível.{' '}
          <Link href="/app/abastecimentos/novo" className="text-[var(--color-marca)]">
            Registre um abastecimento
          </Link>{' '}
          com o hodômetro preenchido.
        </p>
      )}
    </>
  );
}
