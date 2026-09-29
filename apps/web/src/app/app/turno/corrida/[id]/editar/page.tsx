import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FormularioEdicaoGanho } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Editar corrida — Sobrou' };

function minutosParaHHMM(min: number | null): string {
  if (min === null) return '';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default async function EditarCorridaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: corrida } = await supabase
    .from('shift_revenues')
    .select('id, shift_id, category_id, valor, qtd_corridas, km, duracao_min, nota_passageiro, notes')
    .eq('id', id)
    .maybeSingle();

  if (!corrida) notFound();

  const [{ data: turno }, { data: plataformas }] = await Promise.all([
    supabase.from('shifts').select('status').eq('id', corrida.shift_id).maybeSingle(),
    supabase
      .from('categories')
      .select('id, name, is_favorite, sort_order')
      .eq('kind', 'receita')
      .is('archived_at', null)
      .order('is_favorite', { ascending: false })
      .order('sort_order'),
  ]);

  return (
    <>
      <Link href={`/app/turno/corrida/${corrida.id}`} className="text-sm text-[var(--color-marca)]">
        ← Detalhes da corrida
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-bold">Editar corrida</h1>

      {turno?.status !== 'aberto' && (
        <p
          className="mb-6 rounded-[var(--radius-cartao)] p-3 text-sm"
          style={{ background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }}
        >
          O turno desse dia já foi fechado. Dá pra corrigir o lançamento normalmente, mas o resumo
          já calculado daquele turno não se atualiza sozinho — só o valor aqui na lista de
          Transações.
        </p>
      )}

      <FormularioEdicaoGanho
        corridaId={corrida.id}
        plataformas={(plataformas ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          favorita: p.is_favorite,
        }))}
        valorInicial={{
          categoryId: corrida.category_id,
          valor: Number(corrida.valor),
          qtdCorridas: corrida.qtd_corridas !== null ? String(corrida.qtd_corridas) : '',
          km: corrida.km !== null ? String(corrida.km).replace('.', ',') : '',
          horasTrabalhadas: minutosParaHHMM(corrida.duracao_min),
          notaPassageiro: corrida.nota_passageiro !== null ? String(corrida.nota_passageiro).replace('.', ',') : '',
          notes: corrida.notes ?? '',
        }}
      />
    </>
  );
}
