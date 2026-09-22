'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';
import { carregarContexto } from '@/lib/dados/contexto';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { montarInstante, numeroComZero, numeroObrigatorio, numeroOpcional } from '@/lib/numeros';

/**
 * Abastecimentos (seção 3).
 *
 * O que o sistema guarda é o que saiu do bolso. O preço anunciado na placa é
 * registrado só por curiosidade; o preço real por litro é coluna gerada no
 * banco — `valor_pago / litros` — e ninguém digita esse número.
 */

const abastecimentoSchema = z
  .object({
    vehicle_id: z.string().uuid('Escolha o veículo.'),
    data: z.string().min(1, 'Informe a data.'),
    hora: z.string().min(1, 'Informe a hora.'),
    posto: z.string().trim().max(60).optional(),
    fuel_kind: z.enum(['gasolina', 'etanol', 'gnv', 'diesel', 'outro'], {
      errorMap: () => ({ message: 'Escolha o combustível.' }),
    }),
    preco_anunciado: numeroOpcional('Preço anunciado inválido.'),
    litros: numeroObrigatorio('Informe os litros abastecidos.'),
    valor_bruto: numeroObrigatorio('Informe o valor bruto.'),
    desconto: numeroComZero('Desconto inválido.'),
    cashback: numeroComZero('Cashback inválido.'),
    valor_pago: numeroObrigatorio('Informe quanto você pagou.'),
    odometro: numeroOpcional('Hodômetro inválido.'),
    tanque_cheio: z.string().optional(),
    notes: z.string().trim().max(280).optional(),
  })
  .refine((d) => d.desconto <= d.valor_bruto, {
    path: ['desconto'],
    message: 'O desconto não pode ser maior que o valor bruto.',
  })
  .refine((d) => d.valor_pago <= d.valor_bruto + 0.01, {
    path: ['valor_pago'],
    message: 'O valor pago não pode passar do valor bruto.',
  });

type Dados = z.infer<typeof abastecimentoSchema>;

async function montarLinha(d: Dados, timezone: string) {
  return {
    vehicle_id: d.vehicle_id,
    filled_at: montarInstante(d.data, d.hora, timezone).toISOString(),
    station: d.posto || null,
    fuel_kind: d.fuel_kind,
    preco_anunciado: d.preco_anunciado,
    litros: d.litros,
    valor_bruto: d.valor_bruto,
    desconto: d.desconto,
    cashback: d.cashback,
    valor_pago: d.valor_pago,
    odometro: d.odometro,
    tanque_cheio: d.tanque_cheio === 'on',
    notes: d.notes || null,
  };
}

export async function salvarAbastecimento(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = abastecimentoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const ctx = await carregarContexto();
  const linha = await montarLinha(parsed.data, ctx.timezone);

  const id = String(formData.get('id') ?? '').trim();

  const { error } = id
    ? await supabase.from('fuel_entries').update(linha).eq('id', id)
    : await supabase.from('fuel_entries').insert({ ...linha, user_id: user.id });

  if (error) {
    return { erro: 'Não foi possível salvar o abastecimento. Confira os valores.' };
  }

  await supabase.from('app_events').insert({
    user_id: user.id,
    event_key: id ? 'abastecimento_editado' : 'abastecimento_registrado',
  });

  revalidatePath('/app');
  revalidatePath('/app/abastecimentos');
  redirect('/app/abastecimentos');
}

export async function excluirAbastecimento(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createClient();
  // Sem filtro por user_id: a RLS já limita a exclusão às linhas do dono.
  await supabase.from('fuel_entries').delete().eq('id', id);

  revalidatePath('/app');
  revalidatePath('/app/abastecimentos');
  redirect('/app/abastecimentos');
}
