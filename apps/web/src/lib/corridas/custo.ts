import 'server-only';

import {
  avaliarCorrida,
  consumoReal,
  custoTotalPorKm,
  precoReferencia,
  type CustoPorKmBreakdown,
  type FuelEntry,
  type FuelKind,
  type RideEvaluation,
  type RideInput,
  type RideRules,
} from '@sobrou/finance';
import type { Tables } from '@/lib/supabase/database.types';

/**
 * Base de custo do analisador de corridas.
 *
 * Existe porque a mesma conta é pedida de dois lugares: a tela `/app/corrida`,
 * que tem sessão de navegador, e a rota do aparelho, que chega com token do
 * app Android. Se cada uma montasse a sua versão, o card flutuante no celular
 * e a tela no navegador responderiam números diferentes para a mesma corrida —
 * e a primeira vez que isso acontecesse o motorista pararia de confiar nos
 * dois. As entradas mudam; a conta é uma só.
 */

export interface EntradasDeCusto {
  veiculo: Pick<
    Tables<'vehicles'>,
    | 'valor_compra'
    | 'valor_residual_est'
    | 'vida_util_km'
    | 'seguro_mensal'
    | 'custos_fixos_mensais'
    | 'km_medio_mensal'
    | 'manutencao_km_estimada'
    | 'consumo_ref_gasolina'
    | 'consumo_ref_etanol'
    | 'consumo_ref_gnv'
  > | null;
  settings: Pick<
    Tables<'user_settings'>,
    'fuel_price_mode' | 'cashback_reduces_cost' | 'ride_cost_basis'
  > | null;
  abastecimentos: FuelEntry[];
  totalManutencoes12m: number;
  kmRodados12m: number;
}

export interface BaseDeCusto {
  /** O que o analisador deve usar: pode ser só combustível, por escolha do usuário. */
  custoPorKm: number | null;
  combustivelPorKm: number | null;
  /** 'total' inclui desgaste; 'combustivel' é a visão de caixa do dia. */
  base: 'total' | 'combustivel';
  consumo: number | null;
  precoLitro: number | null;
  fuelKind: FuelKind;
  breakdown: CustoPorKmBreakdown | null;
}

function consumoCadastrado(v: EntradasDeCusto['veiculo'], kind: FuelKind): number | null {
  if (!v) return null;
  const campo =
    kind === 'gasolina'
      ? v.consumo_ref_gasolina
      : kind === 'gnv'
        ? v.consumo_ref_gnv
        : v.consumo_ref_etanol;
  return campo === null ? null : Number(campo);
}

export function baseDeCusto(e: EntradasDeCusto): BaseDeCusto {
  const fuelKind: FuelKind = e.abastecimentos.at(-1)?.fuelKind ?? 'etanol';

  // Medido ganha do cadastrado sempre: o consumo do folheto do carro não é o
  // consumo de quem roda em São Paulo com ar-condicionado ligado.
  const consumo = consumoReal(e.abastecimentos, { fuelKind }) ?? consumoCadastrado(e.veiculo, fuelKind);

  const precoLitro = precoReferencia(e.abastecimentos, {
    modo: e.settings?.fuel_price_mode ?? 'ultimo',
    fuelKind,
    cashbackAbateCusto: e.settings?.cashback_reduces_cost ?? true,
  });

  const combustivelPorKm =
    precoLitro !== null && precoLitro > 0 && consumo !== null && consumo > 0
      ? precoLitro / consumo
      : null;

  const breakdown = e.veiculo
    ? custoTotalPorKm({
        combustivelPorKm,
        basis: {
          valorCompra: e.veiculo.valor_compra,
          valorResidualEstimado: e.veiculo.valor_residual_est,
          vidaUtilKm: e.veiculo.vida_util_km,
          seguroMensal: e.veiculo.seguro_mensal,
          custosFixosMensais: e.veiculo.custos_fixos_mensais,
          kmMedioMensal: e.veiculo.km_medio_mensal,
          manutencaoKmEstimada: e.veiculo.manutencao_km_estimada,
        },
        totalManutencoes12m: e.totalManutencoes12m,
        kmRodados12m: e.kmRodados12m,
      })
    : null;

  const base: BaseDeCusto['base'] =
    (e.settings?.ride_cost_basis ?? 'total') === 'total' ? 'total' : 'combustivel';

  return {
    custoPorKm: base === 'total' ? (breakdown?.total ?? combustivelPorKm) : combustivelPorKm,
    combustivelPorKm,
    base,
    consumo,
    precoLitro,
    fuelKind,
    breakdown,
  };
}

/** Converte a linha de `ride_rules` para o formato das fórmulas. */
export function regrasDaLinha(linha: Tables<'ride_rules'> | null): RideRules {
  if (!linha) return {};
  return {
    valorMin: linha.valor_min,
    rsKmMin: linha.rs_km_min,
    rsHoraMin: linha.rs_hora_min,
    distMaxBusca: linha.dist_max_busca,
    notaMin: linha.nota_min,
    margemMin: linha.margem_min,
  };
}

/**
 * Avaliação oficial de uma corrida.
 *
 * O app Android já mostrou um veredito ao motorista antes de a corrida
 * expirar — ele precisa responder em três segundos e não dá para esperar a
 * rede. Mas o que fica no histórico é este resultado, recalculado aqui com as
 * regras e o custo que estão no banco **agora**. Guardar o veredito que o
 * cliente mandou deixaria o histórico sem valor de prova.
 */
export function avaliar(
  input: RideInput,
  regras: RideRules,
  custoPorKm: number | null,
): RideEvaluation {
  return avaliarCorrida(input, regras, custoPorKm);
}
