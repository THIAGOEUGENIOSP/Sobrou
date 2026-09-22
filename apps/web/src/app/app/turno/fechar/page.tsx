import Link from 'next/link';
import { redirect } from 'next/navigation';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { FormularioFecharTurno } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Finalizar turno — Sobrou' };

export default async function FecharTurnoPage() {
  const ctx = await carregarContexto();
  const supabase = await createClient();

  const { data: turno } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', 'aberto')
    .maybeSingle();

  if (!turno) redirect('/app/turno');

  const [{ data: plataformas }, { data: despesas }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, is_favorite, sort_order')
      .eq('kind', 'receita')
      .is('archived_at', null)
      .order('is_favorite', { ascending: false })
      .order('sort_order'),
    supabase.from('transactions').select('valor').eq('shift_id', turno.id).eq('kind', 'despesa'),
  ]);

  const parametros = parametrosDoTurno(ctx);

  return (
    <>
      <Link href="/app/turno" className="text-sm text-[var(--color-marca)]">
        ← Turno
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">Finalizar turno</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Três campos e o dia fecha. O resto o app já sabe.
      </p>

      <FormularioFecharTurno
        shiftId={turno.id}
        iniciadoEm={turno.started_at}
        odoInicial={Number(turno.odo_inicial)}
        consumo={Number(turno.consumo_usado ?? parametros.consumo)}
        precoCombustivel={Number(turno.preco_combustivel_usado ?? parametros.preco)}
        origemConsumo={parametros.origemConsumo}
        despesasDoTurno={(despesas ?? []).map((d) => Number(d.valor))}
        plataformas={(plataformas ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          favorita: p.is_favorite,
        }))}
        allocation={ctx.allocation}
      />
    </>
  );
}
