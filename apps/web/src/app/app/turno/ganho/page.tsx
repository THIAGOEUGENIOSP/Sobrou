import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FormularioGanho } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Adicionar ganho — Sobrou' };

export default async function AdicionarGanhoPage() {
  const supabase = await createClient();

  const { data: turno } = await supabase
    .from('shifts')
    .select('id')
    .eq('status', 'aberto')
    .maybeSingle();

  if (!turno) redirect('/app/turno');

  const { data: plataformas } = await supabase
    .from('categories')
    .select('id, name, is_favorite, sort_order')
    .eq('kind', 'receita')
    .is('archived_at', null)
    .order('is_favorite', { ascending: false })
    .order('sort_order');

  return (
    <>
      <Link href="/app/turno" className="text-sm text-[var(--color-marca)]">
        ← Turno
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">Adicionar ganho</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Uma corrida por toque — o faturamento do dia se soma sozinho.
      </p>

      <FormularioGanho
        shiftId={turno.id}
        plataformas={(plataformas ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          favorita: p.is_favorite,
        }))}
      />
    </>
  );
}
