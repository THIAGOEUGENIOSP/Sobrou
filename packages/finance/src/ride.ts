import { minutesToHours, money, roundTo, safeDiv } from './money';

/**
 * Analisador de corridas (seção 11) — o núcleo do Sobrou.
 *
 * A pergunta é sempre a mesma: esta corrida paga o que ela custa? A resposta
 * usa o custo por km do próprio veículo, e não um palpite. O deslocamento até
 * o passageiro entra na conta: é km rodado sem ninguém pagando por ele, e é
 * exatamente onde a corrida costuma deixar de valer a pena.
 */

export interface RideInput {
  valor: number;
  kmBusca: number;
  kmViagem: number;
  minBusca: number;
  minViagem: number;
  notaPassageiro?: number | null;
  regiaoDestino?: string | null;
  categoria?: string | null;
}

export interface RideRules {
  valorMin?: number | null;
  rsKmMin?: number | null;
  rsHoraMin?: number | null;
  distMaxBusca?: number | null;
  notaMin?: number | null;
  margemMin?: number | null;
}

export interface RideEvaluation {
  kmTotal: number;
  minutosTotal: number;
  horasTotal: number;
  rsKm: number | null;
  rsHora: number | null;
  custoEstimado: number | null;
  margemEstimada: number | null;
  /** Fatia do percurso rodada sem passageiro. Acima de ~40% é sinal de alerta. */
  proporcaoBusca: number | null;
  veredito: 'aceitar' | 'recusar' | 'indefinido';
  /** Regras que falharam, em texto pronto para a tela. */
  motivos: string[];
  /** Regras avaliadas, uma a uma, para o usuário entender o veredito. */
  criterios: Array<{ regra: string; exigido: number; obtido: number | null; atende: boolean }>;
}

/**
 * Avalia uma corrida contra as regras do motorista.
 *
 * `custoPorKm` deve ser o custo total por km quando o motorista quiser a
 * conta completa, ou só o combustível por km quando preferir a visão de caixa
 * do dia. A escolha fica em `user_settings.ride_cost_basis`.
 */
export function avaliarCorrida(
  input: RideInput,
  regras: RideRules = {},
  custoPorKm: number | null = null,
): RideEvaluation {
  const kmTotal = roundTo(Math.max(input.kmBusca, 0) + Math.max(input.kmViagem, 0), 2);
  const minutosTotal = roundTo(Math.max(input.minBusca, 0) + Math.max(input.minViagem, 0), 2);
  const horasTotal = minutesToHours(minutosTotal);

  const rsKm = safeDiv(input.valor, kmTotal, 4);
  // Divide pelos minutos, não pelas horas arredondadas: 20 min viram 0,3333 h
  // e fariam R$ 22 aparecerem como R$ 66,01/h em vez de R$ 66,00/h.
  const rsHora = safeDiv(input.valor * 60, minutosTotal, 2);
  const custoEstimado = custoPorKm !== null ? money(kmTotal * custoPorKm) : null;
  const margemEstimada = custoEstimado !== null ? money(input.valor - custoEstimado) : null;
  const proporcaoBusca = safeDiv(input.kmBusca * 100, kmTotal, 1);

  const criterios: RideEvaluation['criterios'] = [];
  const motivos: string[] = [];

  const checar = (
    regra: string,
    exigido: number | null | undefined,
    obtido: number | null,
    atende: (o: number, e: number) => boolean,
    mensagem: (e: number, o: number | null) => string,
  ) => {
    if (exigido == null) return;
    const ok = obtido !== null && atende(obtido, exigido);
    criterios.push({ regra, exigido, obtido, atende: ok });
    if (!ok) motivos.push(mensagem(exigido, obtido));
  };

  checar(
    'valor_minimo',
    regras.valorMin,
    money(input.valor),
    (o, e) => o >= e,
    (e, o) => `Valor de R$ ${fmt(o)} abaixo do mínimo de R$ ${fmt(e)}.`,
  );
  checar(
    'rs_km_minimo',
    regras.rsKmMin,
    rsKm,
    (o, e) => o >= e,
    (e, o) => `R$ ${fmt(o, 2)}/km abaixo do mínimo de R$ ${fmt(e, 2)}/km.`,
  );
  checar(
    'rs_hora_minimo',
    regras.rsHoraMin,
    rsHora,
    (o, e) => o >= e,
    (e, o) => `R$ ${fmt(o)}/h abaixo do mínimo de R$ ${fmt(e)}/h.`,
  );
  checar(
    'distancia_maxima_busca',
    regras.distMaxBusca,
    roundTo(input.kmBusca, 2),
    (o, e) => o <= e,
    (e, o) => `${fmt(o, 1)} km até o passageiro, acima do limite de ${fmt(e, 1)} km.`,
  );
  checar(
    'nota_minima',
    regras.notaMin,
    input.notaPassageiro ?? null,
    (o, e) => o >= e,
    (e, o) =>
      o === null
        ? `Nota do passageiro não informada (mínimo ${fmt(e, 1)}).`
        : `Nota ${fmt(o, 1)} abaixo do mínimo de ${fmt(e, 1)}.`,
  );
  checar(
    'margem_minima',
    regras.margemMin,
    margemEstimada,
    (o, e) => o >= e,
    (e, o) =>
      o === null
        ? 'Sem custo por km cadastrado, não dá para estimar a margem.'
        : `Margem de R$ ${fmt(o)} abaixo do mínimo de R$ ${fmt(e)}.`,
  );

  // Margem negativa reprova mesmo sem regra cadastrada: a corrida dá prejuízo.
  if (margemEstimada !== null && margemEstimada < 0 && regras.margemMin == null) {
    motivos.push(`A corrida dá prejuízo de R$ ${fmt(Math.abs(margemEstimada))} depois do custo.`);
  }

  const veredito: RideEvaluation['veredito'] =
    criterios.length === 0 && margemEstimada === null
      ? 'indefinido'
      : motivos.length === 0
        ? 'aceitar'
        : 'recusar';

  return {
    kmTotal,
    minutosTotal,
    horasTotal,
    rsKm,
    rsHora,
    custoEstimado,
    margemEstimada,
    proporcaoBusca,
    veredito,
    motivos,
    criterios,
  };
}

function fmt(v: number | null, casas = 2): string {
  if (v === null) return '—';
  return v.toFixed(casas).replace('.', ',');
}

/**
 * Valor mínimo que uma corrida precisa pagar para atender às regras.
 * Serve para a tela mostrar "nesta distância, aceite a partir de R$ X".
 */
export function valorMinimoAceitavel(
  kmTotal: number,
  minutosTotal: number,
  regras: RideRules,
  custoPorKm: number | null = null,
): number | null {
  const horas = minutosTotal / 60; // sem arredondar: é denominador de limiar
  const candidatos: number[] = [];

  if (regras.valorMin != null) candidatos.push(regras.valorMin);
  if (regras.rsKmMin != null && kmTotal > 0) candidatos.push(regras.rsKmMin * kmTotal);
  if (regras.rsHoraMin != null && horas > 0) candidatos.push(regras.rsHoraMin * horas);
  if (regras.margemMin != null && custoPorKm !== null) {
    candidatos.push(regras.margemMin + custoPorKm * kmTotal);
  }
  if (candidatos.length === 0 && custoPorKm !== null) {
    candidatos.push(custoPorKm * kmTotal);
  }

  return candidatos.length > 0 ? money(Math.max(...candidatos)) : null;
}
