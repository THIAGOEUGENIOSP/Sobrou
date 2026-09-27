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

  const [{ data: ganhos }, { data: despesas }, { data: categorias }] = await Promise.all([
    supabase
      .from('shift_revenues')
      .select('category_id, valor, qtd_corridas')
      .eq('shift_id', turno.id),
    supabase.from('transactions').select('valor').eq('shift_id', turno.id).eq('kind', 'despesa'),
    supabase.from('categories').select('id, name').is('archived_at', null),
  ]);

  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.id, c.name]));

  const porCategoria = new Map<string, { valor: number; qtdCorridas: number }>();
  for (const g of ganhos ?? []) {
    const atual = porCategoria.get(g.category_id) ?? { valor: 0, qtdCorridas: 0 };
    atual.valor += Number(g.valor);
    atual.qtdCorridas += g.qtd_corridas ?? 0;
    porCategoria.set(g.category_id, atual);
  }

  const receitas = Array.from(porCategoria.entries()).map(([categoryId, v]) => ({
    categoryId,
    categoryName: nomeCategoria.get(categoryId) ?? 'Receita',
    valor: v.valor,
    qtdCorridas: v.qtdCorridas || null,
  }));

  const parametros = parametrosDoTurno(ctx);

  return (
    <>
      <Link href="/app/turno" className="text-sm text-[var(--color-marca)]">
        ← Turno
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">Finalizar turno</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        O faturamento já está lançado — só falta o hodômetro de agora.
      </p>

      <FormularioFecharTurno
        shiftId={turno.id}
        iniciadoEm={turno.started_at}
        pausedSeconds={Number(turno.paused_seconds ?? 0)}
        pausedAt={turno.paused_at}
        odoInicial={Number(turno.odo_inicial)}
        consumo={Number(turno.consumo_usado ?? parametros.consumo)}
        precoCombustivel={Number(turno.preco_combustivel_usado ?? parametros.preco)}
        origemConsumo={parametros.origemConsumo}
        despesasDoTurno={(despesas ?? []).map((d) => Number(d.valor))}
        receitas={receitas}
        allocation={ctx.allocation}
      />
    </>
  );
}
