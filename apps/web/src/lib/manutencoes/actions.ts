'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { numeroObrigatorio, numeroOpcional } from '@/lib/numeros';

/**
 * Manutenção (seção 9) e o débito na reserva (seção 8).
 *
 * A aplicação NÃO cria o movimento de reserva: quem faz isso é um trigger no
 * banco. Assim, manutenção e débito nascem e morrem juntos, mesmo que alguém
 * altere a linha por outro caminho.
 */

const manutencaoSchema = z.object({
  vehicle_id: z.string().uuid('Escolha o veículo.'),
  category_id: z.string().uuid().optional().or(z.literal('')),
  performed_at: z.string().min(1, 'Informe a data.'),
  valor: numeroObrigatorio('Informe o valor pago.'),
  odometro: numeroOpcional('Hodômetro inválido.'),
  workshop: z.string().trim().max(60).optional(),
  description: z.string().trim().max(120).optional(),
  next_km: numeroOpcional('KM da próxima inválido.'),
  next_date: z.string().optional(),
  pago_com_reserva: z.string().optional(),
});

export async function salvarManutencao(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = manutencaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase.from('maintenances').insert({
    user_id: user.id,
    vehicle_id: d.vehicle_id,
    category_id: d.category_id || null,
    performed_at: d.performed_at,
    valor: d.valor,
    odometro: d.odometro,
    workshop: d.workshop || null,
    description: d.description || null,
    next_km: d.next_km,
    next_date: d.next_date || null,
    pago_com_reserva: d.pago_com_reserva === 'on',
  });

  if (error) return { erro: 'Não foi possível salvar a manutenção.' };

  await supabase.from('app_events').insert({
    user_id: user.id,
    event_key: 'manutencao_registrada',
  });

  revalidatePath('/app');
  revalidatePath('/app/reservas');
  redirect('/app/reservas');
}

const ajusteSchema = z.object({
  reserve_kind: z.enum(['veiculo', 'emergencia']),
  direction: z.enum(['credito', 'debito']),
  valor: numeroObrigatorio('Informe o valor.'),
  description: z.string().trim().max(120).optional(),
});

/** Aporte ou retirada manual na reserva, fora do fechamento do turno. */
export async function ajustarReserva(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = ajusteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('reserve_movements').insert({
    user_id: user.id,
    reserve_kind: parsed.data.reserve_kind,
    direction: parsed.data.direction,
    valor: parsed.data.valor,
    source: 'manual',
    description: parsed.data.description || null,
  });

  if (error) return { erro: 'Não foi possível registrar o movimento.' };

  revalidatePath('/app');
  revalidatePath('/app/reservas');
  redirect('/app/reservas');
}
