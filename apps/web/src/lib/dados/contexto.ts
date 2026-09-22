import 'server-only';

import {
  ALLOCATION_PADRAO,
  consumoReal,
  precoReferencia,
  type AllocationConfig,
  type FuelEntry,
  type FuelKind,
} from '@kmlegal/finance';
import { createClient, requireUser } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';

/**
 * Contexto operacional do usuário.
 *
 * Abastecimento, turno e dashboard precisam das mesmas quatro coisas: o
 * veículo, as configurações, os percentuais vigentes e o histórico recente de
 * combustível. Carregar isso num lugar só evita que cada tela monte a sua
 * própria versão — e divirja.
 */

export interface ContextoUsuario {
  userId: string;
  timezone: string;
  veiculo: Tables<'vehicles'> | null;
  veiculos: Tables<'vehicles'>[];
  settings: Tables<'user_settings'> | null;
  allocation: AllocationConfig;
  allocationId: string | null;
  /** Abastecimentos recentes, do mais antigo para o mais novo. */
  abastecimentos: FuelEntry[];
}

/** Converte a linha do banco para o formato que as fórmulas esperam. */
export function paraFuelEntry(linha: Tables<'fuel_entries'>): FuelEntry {
  return {
    id: linha.id,
    filledAt: linha.filled_at,
    fuelKind: linha.fuel_kind,
    litros: Number(linha.litros),
    valorBruto: Number(linha.valor_bruto),
    desconto: Number(linha.desconto),
    cashback: Number(linha.cashback),
    valorPago: Number(linha.valor_pago),
    odometro: linha.odometro === null ? null : Number(linha.odometro),
    tanqueCheio: linha.tanque_cheio,
  };
}

export async function carregarContexto(): Promise<ContextoUsuario> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: perfil } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: veiculos } = await supabase
    .from('vehicles')
    .select('*')
    .is('archived_at', null)
    .order('created_at');

  const { data: alloc } = await supabase
    .from('allocation_configs')
    .select('id, pct_disponivel, pct_emergencia, pct_veiculo')
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 12 meses cobrem qualquer medição de consumo e a janela de 30 dias do
  // preço médio, sem trazer o histórico inteiro para a memória.
  const limite = new Date();
  limite.setMonth(limite.getMonth() - 12);

  const { data: abastecimentos } = await supabase
    .from('fuel_entries')
    .select('*')
    .gte('filled_at', limite.toISOString())
    .order('filled_at');

  const lista = veiculos ?? [];
  const padrao =
    lista.find((v) => v.id === settings?.default_vehicle_id) ?? lista[0] ?? null;

  return {
    userId: user.id,
    timezone: perfil?.timezone ?? 'America/Sao_Paulo',
    veiculo: padrao,
    veiculos: lista,
    settings: settings ?? null,
    allocation: alloc
      ? {
          pctDisponivel: Number(alloc.pct_disponivel),
          pctEmergencia: Number(alloc.pct_emergencia),
          pctVeiculo: Number(alloc.pct_veiculo),
        }
      : ALLOCATION_PADRAO,
    allocationId: alloc?.id ?? null,
    abastecimentos: (abastecimentos ?? []).map(paraFuelEntry),
  };
}

export interface ParametrosDoTurno {
  /** km/L que será usado no cálculo. */
  consumo: number;
  /** De onde veio esse consumo — a tela avisa o motorista. */
  origemConsumo: 'medido' | 'cadastro' | 'padrao';
  /** R$/L de referência. */
  preco: number;
  origemPreco: 'historico' | 'sem_historico';
  fuelKind: FuelKind;
}

/**
 * Consumo e preço que o turno vai usar.
 *
 * Preferimos sempre o que foi **medido**: o consumo entre tanques cheios e o
 * preço efetivamente pago. O valor cadastrado no veículo é só o ponto de
 * partida de quem ainda não tem histórico.
 */
export function parametrosDoTurno(
  ctx: ContextoUsuario,
  opcoes: { fuelKind?: FuelKind; referencia?: Date } = {},
): ParametrosDoTurno {
  const kindPreferido =
    opcoes.fuelKind ?? ctx.abastecimentos.at(-1)?.fuelKind ?? 'etanol';

  const medido = consumoReal(ctx.abastecimentos, { fuelKind: kindPreferido });
  const doCadastro = consumoCadastrado(ctx.veiculo, kindPreferido);

  const consumo = medido ?? doCadastro ?? 10;
  const origemConsumo: ParametrosDoTurno['origemConsumo'] =
    medido !== null ? 'medido' : doCadastro !== null ? 'cadastro' : 'padrao';

  const preco = precoReferencia(ctx.abastecimentos, {
    modo: ctx.settings?.fuel_price_mode ?? 'ultimo',
    fuelKind: kindPreferido,
    ...(opcoes.referencia ? { referencia: opcoes.referencia } : {}),
    cashbackAbateCusto: ctx.settings?.cashback_reduces_cost ?? true,
  });

  return {
    consumo,
    origemConsumo,
    preco: preco ?? 0,
    origemPreco: preco === null ? 'sem_historico' : 'historico',
    fuelKind: kindPreferido,
  };
}

function consumoCadastrado(
  veiculo: Tables<'vehicles'> | null,
  kind: FuelKind,
): number | null {
  if (!veiculo) return null;
  const campo =
    kind === 'gasolina'
      ? veiculo.consumo_ref_gasolina
      : kind === 'gnv'
        ? veiculo.consumo_ref_gnv
        : veiculo.consumo_ref_etanol;
  return campo === null ? null : Number(campo);
}
