import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FormularioEditarLancamento } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Editar lançamento — Sobrou' };

/**
 * Edição de um lançamento avulso (seção 12 do script — edição em linha nas
 * Transações). Só existe para a tabela `transactions`: receita de turno tem
 * seu próprio resumo (`/app/turno/[id]`), e manutenção ainda não tem tela de
 * edição — mexer nela também move a reserva do carro, e essa tela não cobre
 * esse caso ainda.
 */
export default async function EditarLancamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: transacao } = await supabase
    .from('transactions')
    .select('id, kind, category_id, valor, description, shift_id')
    .eq('id', id)
    .maybeSingle();

  if (!transacao) notFound();

  const { data: categorias } = await supabase
    .from('categories')
    .select('id, name, is_favorite, sort_order')
    .eq('kind', transacao.kind)
    .is('archived_at', null)
    .order('is_favorite', { ascending: false })
    .order('sort_order');

  return (
    <>
      <Link href="/app/transacoes" className="text-sm text-[var(--color-marca)]">
        ← Transações
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">
        Editar {transacao.kind === 'receita' ? 'receita' : 'despesa'}
      </h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Categoria, valor e descrição — o resto do lançamento não muda por aqui.
      </p>

      <FormularioEditarLancamento
        id={transacao.id}
        categoriaAtual={transacao.category_id}
        valorAtual={Number(transacao.valor)}
        descricaoAtual={transacao.description ?? ''}
        categorias={(categorias ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          favorita: c.is_favorite,
        }))}
      />
    </>
  );
}
