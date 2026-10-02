'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fecharTurno, inicioDoMes, type ShiftRevenue } from '@sobrou/finance';
import { createClient, requireUser } from '@/lib/supabase/server';
import { carregarContexto, parametrosDoTurno } from '@/lib/dados/contexto';
import { requireFeature, PlanoInsuficienteError } from '@/lib/entitlements';
import { erroDeZod, type FormState } from '@/lib/auth/schemas';
import { dataLocal, montarInstante, numeroObrigatorio, numeroOpcional } from '@/lib/numeros';

/**
 * Meta do Mês: salvar a meta de um mês, a meta manual de um dia, as
 * configurações (dias, faróis, custos) e registrar uma sessão de trabalho
 * depois do fato. O id do usuário sai sempre da sessão, nunca do formulário.
 */

async function exigirPlano(): Promise<FormState | null> {
  try {
    await requireFeature('goals');
    return null;
  } catch (e) {
    if (e instanceof PlanoInsuficienteError) return { erro: 'A Meta do Mês faz parte do plano Premium.' };
    throw e;
  }
}

function revalidar() {
  revalidatePath('/app');
  revalidatePath('/app/meta', 'layout');
  revalidatePath('/app/metas');
}

const metaMesSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'Escolha o mês.'),
  target_value: numeroObrigatorio('Informe o valor da meta.'),
});

export async function salvarMetaDoMes(_e: FormState, formData: FormData): Promise<FormState> {
  const parsed = metaMesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);
  const bloqueio = await exigirPlano();
  if (bloqueio) return bloqueio;

  const user = await requireUser();
  const supabase = await createClient();
  const ctx = await carregarContexto();
  const mes = `${parsed.data.mes}-01`;

  const { error } = await supabase
    .from('month_targets')
    .upsert({ user_id: user.id, month: mes, target_value: parsed.data.target_value }, { onConflict: 'user_id,month' });
  if (error) return { erro: 'Não foi possível salvar a meta.' };

  // A tela de Metas antiga lê `goals`. Para o mês corrente, as duas contam a
  // mesma história: a meta mensal de faturamento acompanha a do mês.
  if (mes === inicioDoMes(dataLocal(new Date(), ctx.timezone))) {
    const { data: existente } = await supabase
      .from('goals')
      .select('id')
      .eq('kind', 'fat_mensal')
      .eq('is_active', true)
      .maybeSingle();
    if (existente) {
      await supabase.from('goals').update({ target_value: parsed.data.target_value }).eq('id', existente.id);
    } else {
      await supabase.from('goals').insert({ user_id: user.id, kind: 'fat_mensal', target_value: parsed.data.target_value });
    }
  }

  revalidar();
  return { sucesso: 'Meta do mês salva.' };
}

const metaDiaSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target_value: numeroOpcional('Valor inválido.'),
});

/** Meta manual de um dia. Valor vazio volta para a meta automática. */
export async function salvarMetaDoDia(_e: FormState, formData: FormData): Promise<FormState> {
  const parsed = metaDiaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);
  const bloqueio = await exigirPlano();
  if (bloqueio) return bloqueio;

  const user = await requireUser();
  const supabase = await createClient();
  const valor = parsed.data.target_value;

  const { error } =
    valor === null || valor === 0
      ? await supabase.from('day_targets').delete().eq('work_date', parsed.data.data)
      : await supabase
          .from('day_targets')
          .upsert({ user_id: user.id, work_date: parsed.data.data, target_value: valor }, { onConflict: 'user_id,work_date' });
  if (error) return { erro: 'Não foi possível salvar a meta de hoje.' };

  revalidar();
  return { sucesso: valor ? 'Meta de hoje definida.' : 'Meta de hoje volta a ser automática.' };
}

const opcional = (m: string) => numeroOpcional(m);
const configSchema = z
  .object({
    rs_h_vermelho: numeroObrigatorio('Informe o limite.', { min: -1 }),
    rs_h_verde: numeroObrigatorio('Informe o limite.', { min: -1 }),
    rs_km_vermelho: numeroObrigatorio('Informe o limite.', { min: -1 }),
    rs_km_verde: numeroObrigatorio('Informe o limite.', { min: -1 }),
    liq_h_vermelho: numeroObrigatorio('Informe o limite.', { min: -1 }),
    liq_h_verde: numeroObrigatorio('Informe o limite.', { min: -1 }),
    custo_manutencao_km: opcional('Valor inválido.'),
    custo_pneus_km: opcional('Valor inválido.'),
    custo_revisao_km: opcional('Valor inválido.'),
    custo_outros_km: opcional('Valor inválido.'),
  })
  .superRefine((v, ctx) => {
    const pares = [
      ['rs_h_vermelho', 'rs_h_verde'],
      ['rs_km_vermelho', 'rs_km_verde'],
      ['liq_h_vermelho', 'liq_h_verde'],
    ] as const;
    for (const [verm, verde] of pares) {
      if (v[verde] < v[verm]) {
        ctx.addIssue({ code: 'custom', path: [verde], message: 'O verde precisa ser maior ou igual ao vermelho.' });
      }
    }
  });

export async function salvarConfigMeta(_e: FormState, formData: FormData): Promise<FormState> {
  const dias = formData
    .getAll('dias')
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const bruto = Object.fromEntries([...formData.entries()].filter(([k]) => k !== 'dias'));
  const parsed = configSchema.safeParse(bruto);
  if (!parsed.success) return erroDeZod(parsed.error);
  if (dias.length === 0) return { campos: { dias: 'Escolha pelo menos um dia.' }, erro: 'Confira os campos destacados.' };
  const bloqueio = await exigirPlano();
  if (bloqueio) return bloqueio;

  const user = await requireUser();
  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase.from('meta_settings').upsert(
    {
      user_id: user.id,
      work_weekdays: [...new Set(dias)].sort(),
      rs_h_vermelho: d.rs_h_vermelho,
      rs_h_verde: d.rs_h_verde,
      rs_km_vermelho: d.rs_km_vermelho,
      rs_km_verde: d.rs_km_verde,
      liq_h_vermelho: d.liq_h_vermelho,
      liq_h_verde: d.liq_h_verde,
      custo_manutencao_km: d.custo_manutencao_km,
      custo_pneus_km: d.custo_pneus_km ?? 0,
      custo_revisao_km: d.custo_revisao_km ?? 0,
      custo_outros_km: d.custo_outros_km ?? 0,
    },
    { onConflict: 'user_id' },
  );
  if (error) return { erro: 'Não foi possível salvar as configurações.' };

  revalidar();
  return { sucesso: 'Configurações salvas.' };
}

// ---------------------------------------------------------------------------
// Registrar trabalho (sessão já encerrada)

/** "2:21", "2h21", "141" (minutos) → minutos. */
function lerDuracao(texto: string | undefined): number | null {
  if (!texto) return null;
  const t = texto.trim().toLowerCase().replace(/\s/g, '');
  if (t === '') return null;
  let m = t.match(/^(\d{1,2})[:h](\d{1,2})(?:min|m)?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = t.match(/^(\d{1,2})h$/);
  if (m) return Number(m[1]) * 60;
  m = t.match(/^(\d{1,4})(?:min|m)?$/);
  if (m) return Number(m[1]);
  return Number.NaN;
}

const sessaoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data.'),
  hora_inicio: z.string().optional(),
  hora_fim: z.string().optional(),
  tempo_online: z.string().optional(),
  valor: numeroObrigatorio('Informe o faturamento.'),
  category_id: z.string().uuid('Escolha a plataforma.'),
  qtd_corridas: numeroOpcional('Quantidade inválida.'),
  odo_inicial: numeroOpcional('KM inicial inválido.'),
  odo_final: numeroOpcional('KM final inválido.'),
  km: numeroOpcional('KM inválido.'),
  combustivel: numeroOpcional('Valor de combustível inválido.'),
  notes: z.string().trim().max(240).optional(),
});

export async function registrarSessao(_e: FormState, formData: FormData): Promise<FormState> {
  const parsed = sessaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroDeZod(parsed.error);
  const s = parsed.data;

  const ctx = await carregarContexto();
  if (!ctx.veiculo) return { erro: 'Cadastre um veículo antes de registrar trabalho.' };
  if (!ctx.allocationId) return { erro: 'Configure a divisão do resultado em Ajustes antes de registrar.' };
  if (s.data > dataLocal(new Date(), ctx.timezone)) {
    return { campos: { data: 'A data não pode estar no futuro.' }, erro: 'Confira os campos destacados.' };
  }

  // --- tempo -------------------------------------------------------------
  const temHoras = Boolean(s.hora_inicio && s.hora_fim);
  const minutosOnline = lerDuracao(s.tempo_online);
  if (minutosOnline !== null && (!Number.isFinite(minutosOnline) || minutosOnline <= 0 || minutosOnline > 24 * 60)) {
    return { campos: { tempo_online: 'Use o formato 2:21 ou 2h21.' }, erro: 'Confira os campos destacados.' };
  }
  let inicio: Date;
  let fim: Date;
  if (temHoras) {
    inicio = montarInstante(s.data, s.hora_inicio!, ctx.timezone);
    fim = montarInstante(s.data, s.hora_fim!, ctx.timezone);
    // Terminou depois da meia-noite: o fim é no dia seguinte.
    if (fim <= inicio) fim = new Date(fim.getTime() + 86_400_000);
  } else if (minutosOnline) {
    inicio = montarInstante(s.data, s.hora_inicio || '08:00', ctx.timezone);
    fim = new Date(inicio.getTime() + minutosOnline * 60_000);
  } else {
    return {
      campos: { tempo_online: 'Informe o tempo online ou as horas de início e término.' },
      erro: 'Confira os campos destacados.',
    };
  }
  // Tempo online informado vale mais que o relógio entre início e fim (pausas).
  const minutosEfetivos = minutosOnline ?? Math.round((fim.getTime() - inicio.getTime()) / 60_000);
  const fimEfetivo = new Date(inicio.getTime() + minutosEfetivos * 60_000);

  // --- km ----------------------------------------------------------------
  let odoInicial: number;
  let odoFinal: number;
  const temHodometro = s.odo_inicial !== null && s.odo_final !== null;
  if (temHodometro) {
    if (s.odo_final! < s.odo_inicial!) {
      return { campos: { odo_final: 'O KM final não pode ser menor que o inicial.' }, erro: 'Confira os campos destacados.' };
    }
    odoInicial = s.odo_inicial!;
    odoFinal = s.odo_final!;
  } else if (s.km !== null) {
    // Sem hodômetro: o turno guarda só a distância (0 → km). O hodômetro do
    // carro não é mexido.
    odoInicial = 0;
    odoFinal = s.km;
  } else {
    return { campos: { km: 'Informe os KM rodados ou o KM inicial e final.' }, erro: 'Confira os campos destacados.' };
  }

  const p = parametrosDoTurno(ctx);
  const receitas: ShiftRevenue[] = [
    { categoryId: s.category_id, valor: s.valor, qtdCorridas: s.qtd_corridas !== null ? Math.round(s.qtd_corridas) : null },
  ];
  const fechamento = fecharTurno(
    {
      startedAt: inicio.toISOString(),
      endedAt: fimEfetivo.toISOString(),
      odoInicial,
      odoFinal,
      consumo: p.consumo,
      precoCombustivel: p.preco,
      fuelKind: p.fuelKind,
      receitas,
      despesas: [],
      custoCombustivelReal: s.combustivel,
    },
    ctx.allocation,
  );

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc('registrar_sessao', {
    p_vehicle_id: ctx.veiculo.id,
    p_work_date: s.data,
    p_started_at: inicio.toISOString(),
    p_ended_at: fim.toISOString(),
    p_odo_inicial: odoInicial,
    p_odo_final: odoFinal,
    p_consumo: p.consumo,
    p_preco_combustivel: p.preco,
    p_fuel_kind: p.fuelKind,
    p_allocation_config_id: ctx.allocationId,
    p_snapshot: {
      km: fechamento.snapshot.km,
      horas: fechamento.snapshot.horas,
      litros: fechamento.snapshot.litros,
      faturamento: fechamento.snapshot.faturamento,
      custo_combustivel: fechamento.snapshot.custoCombustivel,
      outras_despesas: fechamento.snapshot.outrasDespesas,
      resultado_op: fechamento.snapshot.resultadoOperacional,
      reserva_veiculo: fechamento.snapshot.reservaVeiculo,
      reserva_emerg: fechamento.snapshot.reservaEmergencia,
      disponivel: fechamento.snapshot.disponivel,
      corridas: fechamento.snapshot.qtdCorridas,
    },
    p_receita: {
      category_id: s.category_id,
      valor: s.valor,
      qtd_corridas: s.qtd_corridas !== null ? Math.round(s.qtd_corridas) : null,
      km: fechamento.snapshot.km,
      duracao_min: minutosEfetivos,
      notes: s.notes || null,
    },
    p_creditos: fechamento.creditosReserva.map((c) => ({ reserve_kind: c.reserveKind, valor: c.valor })),
    ...(s.notes ? { p_notes: s.notes } : {}),
  });
  if (error || !id) return { erro: 'Não foi possível registrar o trabalho. Tente novamente.' };

  // Hodômetro do carro só anda se a sessão informou um KM final mais novo.
  if (temHodometro && (ctx.veiculo.odometro_atual === null || odoFinal > Number(ctx.veiculo.odometro_atual))) {
    await supabase.from('vehicles').update({ odometro_atual: odoFinal }).eq('id', ctx.veiculo.id);
  }

  const user = await requireUser();
  await supabase.from('app_events').insert({ user_id: user.id, event_key: 'sessao_registrada' });

  revalidar();
  redirect(`/app/meta/resumo?data=${s.data}`);
}
