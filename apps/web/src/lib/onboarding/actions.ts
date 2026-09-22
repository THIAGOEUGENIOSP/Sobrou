'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';

/**
 * Onboarding em uma tela só (seção 24): template, veículo e percentuais.
 *
 * Três passos é o mínimo para o app já valer alguma coisa: sem veículo não há
 * consumo, sem consumo não há custo de combustível, e sem percentuais não há
 * distribuição.
 */

/** Aceita "9,6" e "9.6": o teclado do celular brasileiro manda vírgula. */
const numeroBR = (mensagem: string) =>
  z
    .string()
    .trim()
    .min(1, mensagem)
    .transform((v) => Number(v.replace(/\./g, '').replace(',', '.')))
    .refine((n) => Number.isFinite(n) && n > 0, mensagem);

const onboardingSchema = z
  .object({
    template_id: z.string().uuid('Escolha uma atividade.'),
    apelido: z.string().trim().min(1, 'Dê um nome ao veículo.').max(40),
    modelo: z.string().trim().max(60).optional(),
    consumo: numeroBR('Informe o consumo médio, por exemplo 9,6.'),
    odometro: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v.replace(/\./g, '').replace(',', '.')) : null)),
    pct_disponivel: numeroBR('Informe o percentual disponível.'),
    pct_emergencia: z
      .string()
      .trim()
      .transform((v) => Number((v || '0').replace(',', '.'))),
    pct_veiculo: z
      .string()
      .trim()
      .transform((v) => Number((v || '0').replace(',', '.'))),
  })
  .refine(
    (d) => Math.abs(d.pct_disponivel + d.pct_emergencia + d.pct_veiculo - 100) < 0.005,
    {
      path: ['pct_disponivel'],
      message: 'Os três percentuais precisam somar exatamente 100%.',
    },
  );

export async function concluirOnboarding(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const d = parsed.data;

  // 1. Template: copia categorias, campos e cards para o usuário.
  const { error: erroTemplate } = await supabase.rpc('apply_template', {
    p_template_id: d.template_id,
  });
  if (erroTemplate) return { erro: 'Não foi possível aplicar o modelo. Tente novamente.' };

  // 2. Veículo. O user_id vem da sessão, nunca do formulário.
  const { data: veiculo, error: erroVeiculo } = await supabase
    .from('vehicles')
    .insert({
      user_id: user.id,
      nickname: d.apelido,
      make_model: d.modelo || null,
      consumo_ref_etanol: d.consumo,
      odometro_atual: d.odometro,
    })
    .select('id')
    .single();

  if (erroVeiculo || !veiculo) {
    return { erro: 'Não foi possível salvar o veículo. Confira os dados e tente de novo.' };
  }

  await supabase
    .from('user_settings')
    .update({ default_vehicle_id: veiculo.id })
    .eq('user_id', user.id);

  // 3. Percentuais: nova versão, preservando o histórico anterior.
  const { error: erroPct } = await supabase.from('allocation_configs').insert({
    user_id: user.id,
    pct_disponivel: d.pct_disponivel,
    pct_emergencia: d.pct_emergencia,
    pct_veiculo: d.pct_veiculo,
  });
  if (erroPct) return { erro: 'Os percentuais precisam somar exatamente 100%.' };

  await supabase.from('profiles').update({ onboarding_done: true }).eq('user_id', user.id);
  await supabase.from('app_events').insert({ user_id: user.id, event_key: 'onboarding_concluido' });

  redirect('/app');
}
