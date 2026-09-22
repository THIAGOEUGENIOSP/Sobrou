import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carregarContexto } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { excluirAbastecimento } from '@/lib/abastecimentos/actions';
import { dataLocal } from '@/lib/numeros';
import { FormularioAbastecimento } from '../formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Editar abastecimento — Sobrou' };

export default async function EditarAbastecimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await carregarContexto();
  const supabase = await createClient();

  const { data: linha } = await supabase
    .from('fuel_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!linha) notFound();

  const quando = new Date(linha.filled_at);
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: ctx.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(quando);

  const texto = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));

  return (
    <>
      <Link href="/app/abastecimentos" className="text-sm text-[var(--color-marca)]">
        ← Abastecimentos
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-bold">Editar abastecimento</h1>

      <FormularioAbastecimento
        edicao
        veiculos={ctx.veiculos.map((v) => ({ id: v.id, nickname: v.nickname }))}
        valores={{
          id: linha.id,
          vehicle_id: linha.vehicle_id,
          data: dataLocal(quando, ctx.timezone),
          hora,
          posto: linha.station ?? '',
          fuel_kind: linha.fuel_kind,
          preco_anunciado: texto(linha.preco_anunciado),
          litros: texto(linha.litros),
          valor_bruto: texto(linha.valor_bruto),
          desconto: texto(linha.desconto),
          cashback: texto(linha.cashback),
          valor_pago: texto(linha.valor_pago),
          odometro: texto(linha.odometro),
          tanque_cheio: linha.tanque_cheio,
          notes: linha.notes ?? '',
        }}
      />

      <form action={excluirAbastecimento} className="mt-8 border-t border-[var(--color-borda)] pt-6">
        <input type="hidden" name="id" value={linha.id} />
        <button
          type="submit"
          className="w-full rounded-full border border-[var(--color-alerta)] px-6 py-3 text-sm font-semibold text-[var(--color-alerta)]"
        >
          Excluir este abastecimento
        </button>
        <p className="mt-2 text-center text-xs text-[var(--color-tinta-suave)]">
          Excluir muda o consumo medido dos trechos vizinhos.
        </p>
      </form>
    </>
  );
}
