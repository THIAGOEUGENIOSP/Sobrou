import 'server-only';

import { createClient } from '@/lib/supabase/server';

export interface ItemTransacao {
  id: string;
  /** Data no formato YYYY-MM-DD — a mesma usada pra agrupar por dia na tela. */
  data: string;
  tipo: 'entrada' | 'saida';
  titulo: string;
  subtitulo: string | null;
  valor: number;
  cor: string | null;
  /** Pra onde editar este lançamento — null quando ainda não existe uma tela de edição pra esse tipo. */
  href: string | null;
}

/**
 * Junta num histórico só o que hoje vive espalhado em 4 tabelas: receita por
 * plataforma dentro de um turno fechado (`shift_revenues`), abastecimentos,
 * manutenções e lançamentos avulsos (receita ou despesa, dentro ou fora de
 * turno). É a mesma leitura que Relatórios faz, só que devolvendo cada linha
 * em vez de já agregar em totais.
 */
export async function carregarTransacoes(de: string, ate: string): Promise<ItemTransacao[]> {
  const supabase = await createClient();

  const [
    { data: turnos },
    { data: receitasTurno },
    { data: abastecimentos },
    { data: manutencoes },
    { data: avulsos },
    { data: categorias },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, work_date')
      .eq('status', 'fechado')
      .gte('work_date', de)
      .lte('work_date', ate),
    supabase.from('shift_revenues').select('id, shift_id, category_id, valor, qtd_corridas'),
    supabase
      .from('fuel_entries')
      .select('id, filled_at, station, litros, valor_pago, cashback')
      .gte('filled_at', `${de}T00:00:00`)
      .lte('filled_at', `${ate}T23:59:59`),
    supabase
      .from('maintenances')
      .select('id, performed_at, workshop, description, valor, category_id')
      .gte('performed_at', de)
      .lte('performed_at', ate),
    supabase
      .from('transactions')
      .select('id, work_date, kind, category_id, description, valor')
      .gte('work_date', de)
      .lte('work_date', ate),
    supabase.from('categories').select('id, name, color'),
  ]);

  const nome = new Map((categorias ?? []).map((c) => [c.id, c.name]));
  const cor = new Map((categorias ?? []).map((c) => [c.id, c.color]));
  const corCombustivel = cor.get(
    (categorias ?? []).find((c) => c.name === 'Combustível')?.id ?? '',
  );

  const turnosPorId = new Map((turnos ?? []).map((t) => [t.id, t]));

  const itens: ItemTransacao[] = [];

  for (const r of receitasTurno ?? []) {
    const turno = turnosPorId.get(r.shift_id);
    if (!turno) continue;
    itens.push({
      id: `receita_${r.id}`,
      data: turno.work_date,
      tipo: 'entrada',
      titulo: nome.get(r.category_id) ?? 'Receita',
      subtitulo: r.qtd_corridas ? `${r.qtd_corridas} corridas` : null,
      valor: Number(r.valor),
      cor: cor.get(r.category_id) ?? null,
      href: `/app/turno/${turno.id}`,
    });
  }

  for (const a of abastecimentos ?? []) {
    const litros = Number(a.litros);
    itens.push({
      id: `abastecimento_${a.id}`,
      data: a.filled_at.slice(0, 10),
      tipo: 'saida',
      titulo: 'Abastecimento',
      subtitulo: [a.station, `${litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`]
        .filter(Boolean)
        .join(' · '),
      valor: Number(a.valor_pago) - Number(a.cashback),
      cor: corCombustivel ?? 'var(--color-alerta)',
      href: `/app/abastecimentos/${a.id}`,
    });
  }

  for (const m of manutencoes ?? []) {
    itens.push({
      id: `manutencao_${m.id}`,
      data: m.performed_at,
      tipo: 'saida',
      titulo: nome.get(m.category_id ?? '') ?? 'Manutenção',
      subtitulo: m.workshop ?? m.description ?? null,
      valor: Number(m.valor),
      cor: cor.get(m.category_id ?? '') ?? 'var(--color-alerta)',
      href: null,
    });
  }

  for (const t of avulsos ?? []) {
    itens.push({
      id: `lancamento_${t.id}`,
      data: t.work_date,
      tipo: t.kind === 'receita' ? 'entrada' : 'saida',
      titulo: nome.get(t.category_id) ?? (t.kind === 'receita' ? 'Receita' : 'Despesa'),
      subtitulo: t.description,
      valor: Number(t.valor),
      cor: cor.get(t.category_id) ?? null,
      href: `/app/lancamentos/${t.id}`,
    });
  }

  return itens.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}
