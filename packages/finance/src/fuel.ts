import { money, rate, roundTo, safeDiv } from './money';
import type { FuelEntry, FuelKind, FuelPriceMode } from './types';

/**
 * Combustível: preço real por litro, consumo real por tanque cheio e preço
 * de referência para calcular o custo do turno.
 *
 * O preço anunciado na placa do posto é ignorado de propósito. O que importa
 * é o que saiu do bolso dividido pelos litros que entraram no tanque.
 */

/** Preço real por litro: valor pago na bomba ÷ litros. */
export function precoRealLitro(entry: Pick<FuelEntry, 'valorPago' | 'litros'>): number | null {
  return safeDiv(entry.valorPago, entry.litros, 4);
}

/**
 * Custo efetivo do abastecimento.
 *
 * O cashback é configurável porque as duas leituras são defensáveis:
 * - `cashbackAbateCusto = true`: o cashback baixa o custo do combustível.
 * - `false`: o cashback entra como receita à parte. Faz mais sentido quando
 *   ele só cai semanas depois, porque abater no dia distorce o custo do dia.
 */
export function custoEfetivo(entry: FuelEntry, cashbackAbateCusto = true): number {
  const base = entry.valorPago - (cashbackAbateCusto ? entry.cashback : 0);
  return money(Math.max(base, 0));
}

/** Preço efetivo por litro, já considerando a regra de cashback. */
export function precoEfetivoLitro(entry: FuelEntry, cashbackAbateCusto = true): number | null {
  return safeDiv(custoEfetivo(entry, cashbackAbateCusto), entry.litros, 4);
}

/** Valor a pagar sugerido no formulário: bruto − desconto. */
export function valorPagoSugerido(valorBruto: number, desconto = 0): number {
  return money(Math.max(valorBruto - desconto, 0));
}

/** Economia obtida em um abastecimento, comparada ao preço anunciado. */
export function economiaNoAbastecimento(entry: FuelEntry): number {
  return money(entry.desconto + entry.cashback);
}

function toTime(value: Date | string): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}

function ordenar(entries: readonly FuelEntry[]): FuelEntry[] {
  return [...entries].sort((a, b) => toTime(a.filledAt) - toTime(b.filledAt));
}

/** Um trecho entre dois tanques cheios consecutivos. */
export interface ConsumoSegment {
  deOdometro: number;
  ateOdometro: number;
  km: number;
  litros: number;
  /** km/L do trecho. */
  consumo: number;
  /** null quando o trecho misturou combustíveis diferentes. */
  fuelKind: FuelKind | null;
  de: Date;
  ate: Date;
}

/**
 * Consumo real, medido entre tanques cheios.
 *
 * Método: entre dois abastecimentos "tanque cheio", o veículo rodou a
 * diferença de hodômetro usando exatamente os litros colocados nesse
 * intervalo (incluindo o abastecimento final). Abastecimentos parciais no
 * meio do caminho entram na conta dos litros, mas não fecham um trecho.
 *
 * Abastecimentos sem hodômetro são ignorados como fechamento de trecho: sem
 * hodômetro não há distância e a medição não existe.
 */
export function consumoPorTanque(entries: readonly FuelEntry[]): ConsumoSegment[] {
  const ordenados = ordenar(entries);
  const segments: ConsumoSegment[] = [];

  let ancora: FuelEntry | null = null;
  let litrosAcumulados = 0;
  let kindsNoTrecho = new Set<FuelKind>();

  for (const entry of ordenados) {
    if (ancora === null) {
      if (entry.tanqueCheio && entry.odometro !== null) {
        ancora = entry;
        litrosAcumulados = 0;
        kindsNoTrecho = new Set();
      }
      continue;
    }

    litrosAcumulados += entry.litros;
    kindsNoTrecho.add(entry.fuelKind);

    if (!entry.tanqueCheio || entry.odometro === null) continue;

    const km = roundTo(entry.odometro - (ancora.odometro as number), 2);
    const consumo = safeDiv(km, litrosAcumulados, 3);

    if (km > 0 && consumo !== null && consumo > 0) {
      segments.push({
        deOdometro: ancora.odometro as number,
        ateOdometro: entry.odometro,
        km,
        litros: roundTo(litrosAcumulados, 3),
        consumo,
        fuelKind: kindsNoTrecho.size === 1 ? [...kindsNoTrecho][0]! : null,
        de: new Date(toTime(ancora.filledAt)),
        ate: new Date(toTime(entry.filledAt)),
      });
    }

    ancora = entry;
    litrosAcumulados = 0;
    kindsNoTrecho = new Set();
  }

  return segments;
}

/**
 * Consumo real médio em km/L, ponderado pelos litros de cada trecho.
 *
 * Com `fuelKind`, considera apenas os trechos rodados exclusivamente com
 * aquele combustível — é assim que se compara etanol e gasolina de verdade,
 * em vez de usar a regra genérica dos 70%.
 */
export function consumoReal(
  entries: readonly FuelEntry[],
  options: { fuelKind?: FuelKind; ultimosTrechos?: number } = {},
): number | null {
  let segments = consumoPorTanque(entries);

  if (options.fuelKind) {
    segments = segments.filter((s) => s.fuelKind === options.fuelKind);
  }
  if (options.ultimosTrechos && options.ultimosTrechos > 0) {
    segments = segments.slice(-options.ultimosTrechos);
  }
  if (segments.length === 0) return null;

  const km = segments.reduce((acc, s) => acc + s.km, 0);
  const litros = segments.reduce((acc, s) => acc + s.litros, 0);
  return safeDiv(km, litros, 2);
}

/**
 * Preço de referência do combustível para custear um turno.
 *
 * - `ultimo`: preço efetivo do último abastecimento daquele combustível.
 * - `media_ponderada_30d`: custo total ÷ litros totais dos últimos 30 dias,
 *   ponderado pelos litros (não é média simples de preços).
 */
export function precoReferencia(
  entries: readonly FuelEntry[],
  options: {
    modo?: FuelPriceMode;
    fuelKind?: FuelKind;
    referencia?: Date | string;
    cashbackAbateCusto?: boolean;
    janelaDias?: number;
  } = {},
): number | null {
  const {
    modo = 'ultimo',
    fuelKind,
    referencia = new Date(),
    cashbackAbateCusto = true,
    janelaDias = 30,
  } = options;

  const refTime = toTime(referencia);
  let candidatos = ordenar(entries).filter((e) => toTime(e.filledAt) <= refTime);
  if (fuelKind) candidatos = candidatos.filter((e) => e.fuelKind === fuelKind);
  if (candidatos.length === 0) return null;

  if (modo === 'ultimo') {
    const ultimo = candidatos[candidatos.length - 1]!;
    return precoEfetivoLitro(ultimo, cashbackAbateCusto);
  }

  const limite = refTime - janelaDias * 86_400_000;
  const janela = candidatos.filter((e) => toTime(e.filledAt) >= limite);
  const usados = janela.length > 0 ? janela : [candidatos[candidatos.length - 1]!];

  const custo = usados.reduce((acc, e) => acc + custoEfetivo(e, cashbackAbateCusto), 0);
  const litros = usados.reduce((acc, e) => acc + e.litros, 0);
  return safeDiv(custo, litros, 4);
}

/** Uma opção de combustível no comparador. */
export interface OpcaoCombustivel {
  fuelKind: FuelKind;
  /** Preço por litro (ou por m³, no GNV). */
  preco: number;
  /** Consumo real do veículo com esse combustível, em km/L. */
  consumo: number;
}

export interface ResultadoComparacao {
  opcoes: Array<OpcaoCombustivel & { custoPorKm: number | null }>;
  vencedor: FuelKind | null;
  /** Quanto se economiza por km escolhendo o vencedor em vez do segundo. */
  economiaPorKm: number | null;
  /**
   * Paridade real do veículo: consumo com etanol ÷ consumo com gasolina.
   * Substitui a regra genérica dos 70% pela medição do carro do motorista.
   */
  paridadeReal: number | null;
}

/**
 * Etanol × gasolina (seção 16), decidido por custo por km e não por regra de bolso.
 *
 * custoPorKm = preço do litro ÷ consumo real naquele combustível.
 */
export function compararCombustiveis(opcoes: readonly OpcaoCombustivel[]): ResultadoComparacao {
  const avaliadas = opcoes.map((o) => ({
    ...o,
    custoPorKm: safeDiv(o.preco, o.consumo, 4),
  }));

  const validas = avaliadas
    .filter((o): o is typeof o & { custoPorKm: number } => o.custoPorKm !== null)
    .sort((a, b) => a.custoPorKm - b.custoPorKm);

  const etanol = opcoes.find((o) => o.fuelKind === 'etanol');
  const gasolina = opcoes.find((o) => o.fuelKind === 'gasolina');
  const paridadeReal =
    etanol && gasolina ? safeDiv(etanol.consumo, gasolina.consumo, 4) : null;

  return {
    opcoes: avaliadas,
    vencedor: validas[0]?.fuelKind ?? null,
    economiaPorKm:
      validas.length >= 2 ? rate(validas[1]!.custoPorKm - validas[0]!.custoPorKm) : null,
    paridadeReal,
  };
}
