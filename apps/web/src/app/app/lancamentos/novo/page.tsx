import Link from 'next/link';
import { carregarContexto } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { FormularioLancamento } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Novo lançamento — KM Legal' };

export default async function NovoLancamentoPage() {
  const ctx = await carregarContexto();
  const supabase = await createClient();

  const [{ data: categorias }, { data: turnoAberto }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, kind, is_favorite, sort_order')
      .eq('kind', 'despesa')
      .is('archived_at', null)
      .order('is_favorite', { ascending: false })
      .order('sort_order'),
    supabase.from('shifts').select('id').eq('status', 'aberto').maybeSingle(),
  ]);

  return (
    <>
      <Link href={turnoAberto ? '/app/turno' : '/app'} className="text-sm text-[var(--color-marca)]">
        ← Voltar
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">Nova despesa</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        {turnoAberto
          ? 'Entra no turno aberto e é descontada no fechamento do dia.'
          : 'Lançamento avulso, fora de turno.'}
      </p>

      <FormularioLancamento
        categorias={(categorias ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          favorita: c.is_favorite,
        }))}
        shiftId={turnoAberto?.id ?? ''}
        vehicleId={ctx.veiculo?.id ?? ''}
      />
    </>
  );
}
