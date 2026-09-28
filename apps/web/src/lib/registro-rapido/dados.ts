import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { dataLocal } from '@/lib/numeros';

export interface ItemRegistroRapido {
  id: string;
  titulo: string;
  subtitulo: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  cor: string | null;
  horarioIso: string;
}

/**
 * Os últimos lançamentos de hoje, na ordem em que aconteceram — pro "Registro
 * rápido" dentro do bottom sheet "Novo registro" (seção do mockup). Cada
 * corrida real, cada abastecimento e cada despesa de hoje entra na mesma
 * lista, mais recente primeiro.
 */
export async function carregarRegistroRapido(
  timezone: string,
  limite = 3,
): Promise<ItemRegistroRapido[]> {
  const supabase = await createClient();
  const hoje = dataLocal(new Date(), timezone);

  const [{ data: turnosHoje }, { data: abastecimentos }, { data: despesas }, { data: categorias }] =
    await Promise.all([
      supabase.from('shifts').select('id').eq('work_date', hoje),
      supabase
        .from('fuel_entries')
        .select('id, filled_at, valor_pago, cashback')
        .gte('filled_at', `${hoje}T00:00:00`)
        .lte('filled_at', `${hoje}T23:59:59`),
      supabase
        .from('transactions')
        .select('id, occurred_at, category_id, description, valor')
        .eq('kind', 'despesa')
        .eq('work_date', hoje),
      supabase.from('categories').select('id, name, color'),
    ]);

  const nome = new Map((categorias ?? []).map((c) => [c.id, c.name]));
  const cor = new Map((categorias ?? []).map((c) => [c.id, c.color]));
  const corCombustivel = cor.get((categorias ?? []).find((c) => c.name === 'Combustível')?.id ?? '');

  const idsTurnos = (turnosHoje ?? []).map((t) => t.id);
  const { data: ganhos } = idsTurnos.length
    ? await supabase
        .from('shift_revenues')
        .select('id, category_id, valor, occurred_at')
        .in('shift_id', idsTurnos)
    : { data: [] as Array<{ id: string; category_id: string; valor: number; occurred_at: string }> };

  const itens: ItemRegistroRapido[] = [];

  for (const g of ganhos ?? []) {
    itens.push({
      id: `ganho_${g.id}`,
      titulo: nome.get(g.category_id) ?? 'Corrida',
      subtitulo: `Hoje ${horaCurta(g.occurred_at, timezone)}`,
      valor: Number(g.valor),
      tipo: 'entrada',
      cor: cor.get(g.category_id) ?? null,
      horarioIso: g.occurred_at,
    });
  }

  for (const a of abastecimentos ?? []) {
    itens.push({
      id: `abastecimento_${a.id}`,
      titulo: 'Abastecimento',
      subtitulo: `Hoje ${horaCurta(a.filled_at, timezone)}`,
      valor: Number(a.valor_pago) - Number(a.cashback),
      tipo: 'saida',
      cor: corCombustivel ?? null,
      horarioIso: a.filled_at,
    });
  }

  for (const d of despesas ?? []) {
    itens.push({
      id: `despesa_${d.id}`,
      titulo: nome.get(d.category_id) ?? 'Despesa',
      subtitulo: `Hoje ${horaCurta(d.occurred_at, timezone)}`,
      valor: Number(d.valor),
      tipo: 'saida',
      cor: cor.get(d.category_id) ?? null,
      horarioIso: d.occurred_at,
    });
  }

  return itens.sort((a, b) => (a.horarioIso < b.horarioIso ? 1 : -1)).slice(0, limite);
}

function horaCurta(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}
