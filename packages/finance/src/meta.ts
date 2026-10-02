import { money, roundTo, safeDiv } from './money';
import { progressoMeta, type ProgressoMeta } from './period';
import { diasNoIntervalo, somarDias } from './periodo';

/**
 * Meta do Mês e Meta de Hoje.
 *
 * Tudo aqui sai do histórico registrado. Quando não há base (nenhuma hora ou
 * nenhum km lançado), o resultado é `null` e a tela mostra "—": uma projeção
 * feita sem dado seria um número inventado com cara de cálculo.
 *
 * Faturamento ≠ lucro. As funções de meta trabalham com faturamento (é o que o
 * motorista acompanha no app da plataforma); o lucro é calculado à parte, em
 * `lucroEstimado`, e nunca é misturado com a meta.
 */

/** Dia da semana de uma data ISO (0 = domingo … 6 = sábado). */
export function diaDaSemana(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Último dia do mês de uma data ISO. */
export function fimDoMes(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

/** Primeiro dia do mês de uma data ISO. */
export function inicioDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export interface Desempenho {
  faturamento: number;
  horas: number;
  km: number;
  diasTrabalhados: number;
}

export interface Medias {
  porHora: number | null;
  porKm: number | null;
  porDia: number | null;
}

/** R$/hora, R$/km e média por dia trabalhado. */
export function medias(d: Desempenho): Medias {
  return {
    porHora: d.horas > 0 ? safeDiv(d.faturamento, d.horas, 2) : null,
    porKm: d.km > 0 ? safeDiv(d.faturamento, d.km, 4) : null,
    porDia: d.diasTrabalhados > 0 ? safeDiv(d.faturamento, d.diasTrabalhados, 2) : null,
  };
}

/** Datas planejadas entre `de` e `ate` (inclusive) cujo dia da semana está no plano. */
export function datasPlanejadas(de: string, ate: string, diasDaSemana: readonly number[]): string[] {
  if (de > ate) return [];
  const plano = new Set(diasDaSemana);
  const total = diasNoIntervalo(de, ate);
  const saida: string[] = [];
  for (let i = 0; i < total; i++) {
    const d = somarDias(de, i);
    if (plano.has(diaDaSemana(d))) saida.push(d);
  }
  return saida;
}

export interface PlanoMesInput {
  /** Meta de faturamento do mês. */
  alvo: number;
  /** Hoje, no fuso do motorista (YYYY-MM-DD). */
  hoje: string;
  /** Dias da semana em que o motorista pretende trabalhar (0 = domingo). */
  diasDeTrabalho: readonly number[];
  /** Faturamento do mês até ontem. */
  faturadoAntesDeHoje: number;
  /** Faturamento de hoje (turno aberto + sessões fechadas de hoje). */
  faturadoHoje: number;
  /** true quando já não há turno aberto e o dia foi encerrado. */
  hojeEncerrado: boolean;
  /** Desempenho do mês inteiro, hoje incluído — base das médias. */
  desempenho: Desempenho;
  /** Meta de hoje definida à mão. `null` = automática. */
  metaManualHoje?: number | null;
}

export interface DiaPlanejado {
  data: string;
  /** Mínimo para manter a meta do mês no prazo. */
  minima: number;
  /** Com folga de um dia de imprevisto (igual à mínima quando só resta 1 dia). */
  ideal: number;
  horasEstimadas: number | null;
  kmEstimados: number | null;
}

export interface Cenario {
  chave: 'conservador' | 'atual' | 'excelente';
  rotulo: string;
  fator: number;
  porHora: number | null;
  porKm: number | null;
  faturamentoProjetado: number | null;
  horasParaMeta: number | null;
  kmParaMeta: number | null;
}

export interface PlanoMes {
  progresso: ProgressoMeta;
  medias: Medias;
  /** Hoje conta como dia de trabalho (está no plano ou já teve faturamento). */
  hojeEhDiaDeTrabalho: boolean;
  /** Meta de hoje — `null` quando hoje é folga e nada foi faturado. */
  metaHoje: number | null;
  metaHojeAutomatica: number | null;
  metaHojeManual: boolean;
  /** Faturado hoje − meta de hoje. Positivo = excedente, negativo = déficit. */
  saldoHoje: number | null;
  /** Dias de trabalho depois de hoje, até o fim do mês. */
  proximosDias: DiaPlanejado[];
  /** Meta média por próximo dia de trabalho. */
  metaPorProximoDia: number | null;
  diasRestantesNoMes: number;
  /** Horas e km necessários para fechar o que falta, no ritmo atual. */
  horasNecessarias: number | null;
  kmNecessarios: number | null;
  cenarios: Cenario[];
}

/**
 * Planejamento do mês.
 *
 * Meta de hoje (automática) = o que faltava ao começar o dia ÷ dias de trabalho
 * restantes, contando hoje. Os próximos dias dividem o que faltar depois de
 * hoje — e "depois de hoje" considera, enquanto o dia está em andamento, que
 * você vai bater pelo menos a meta de hoje. Encerrado o dia, entra o número
 * real: o excedente diminui as metas seguintes e o déficit as aumenta.
 */
export function planejarMes(input: PlanoMesInput): PlanoMes {
  const { alvo, hoje, diasDeTrabalho } = input;
  const ultimo = fimDoMes(hoje);
  const realizado = input.faturadoAntesDeHoje + input.faturadoHoje;
  const progresso = progressoMeta(realizado, alvo);
  const m = medias(input.desempenho);

  const hojePlanejado = diasDeTrabalho.includes(diaDaSemana(hoje));
  const hojeEhDiaDeTrabalho = hojePlanejado || input.faturadoHoje > 0;
  const depoisDeHoje = datasPlanejadas(somarDias(hoje, 1), ultimo, diasDeTrabalho);

  const faltavaNoInicioDoDia = Math.max(alvo - input.faturadoAntesDeHoje, 0);
  const diasContandoHoje = depoisDeHoje.length + (hojeEhDiaDeTrabalho ? 1 : 0);

  const metaHojeAutomatica =
    hojeEhDiaDeTrabalho && diasContandoHoje > 0 ? money(faltavaNoInicioDoDia / diasContandoHoje) : null;
  const manual =
    input.metaManualHoje !== null && input.metaManualHoje !== undefined && input.metaManualHoje > 0
      ? money(input.metaManualHoje)
      : null;
  const metaHoje = manual ?? metaHojeAutomatica;

  const contaHoje = input.hojeEncerrado
    ? input.faturadoHoje
    : Math.max(input.faturadoHoje, metaHoje ?? 0);
  const faltaDepoisDeHoje = Math.max(alvo - input.faturadoAntesDeHoje - contaHoje, 0);

  const n = depoisDeHoje.length;
  const minima = n > 0 ? money(faltaDepoisDeHoje / n) : null;
  const ideal = n > 1 ? money(faltaDepoisDeHoje / (n - 1)) : minima;

  const proximosDias: DiaPlanejado[] =
    minima === null
      ? []
      : depoisDeHoje.map((data) => ({
          data,
          minima,
          ideal: ideal ?? minima,
          horasEstimadas: m.porHora ? roundTo(minima / m.porHora, 2) : null,
          kmEstimados: m.porKm ? roundTo(minima / m.porKm, 1) : null,
        }));

  // Dias que ainda vão somar faturamento: os próximos e, se hoje é dia de
  // trabalho que ainda não começou, hoje também. Um dia já em andamento não
  // entra de novo — o parcial dele já está no realizado.
  const diasFuturos = n + (hojeEhDiaDeTrabalho && input.faturadoHoje === 0 && !input.hojeEncerrado ? 1 : 0);

  const cenarios: Cenario[] = (
    [
      ['conservador', 'Conservador', 0.85],
      ['atual', 'Atual', 1],
      ['excelente', 'Excelente', 1.15],
    ] as const
  ).map(([chave, rotulo, fator]) => {
    const porHora = m.porHora !== null ? roundTo(m.porHora * fator, 2) : null;
    const porKm = m.porKm !== null ? roundTo(m.porKm * fator, 4) : null;
    return {
      chave,
      rotulo,
      fator,
      porHora,
      porKm,
      faturamentoProjetado: m.porDia !== null ? money(realizado + m.porDia * fator * diasFuturos) : null,
      horasParaMeta: porHora ? roundTo(progresso.restante / porHora, 2) : null,
      kmParaMeta: porKm ? roundTo(progresso.restante / porKm, 1) : null,
    };
  });

  return {
    progresso,
    medias: m,
    hojeEhDiaDeTrabalho,
    metaHoje,
    metaHojeAutomatica,
    metaHojeManual: manual !== null,
    saldoHoje: metaHoje !== null ? money(input.faturadoHoje - metaHoje) : null,
    proximosDias,
    metaPorProximoDia: minima,
    diasRestantesNoMes: diasNoIntervalo(hoje, ultimo) - 1,
    horasNecessarias: m.porHora ? roundTo(progresso.restante / m.porHora, 2) : null,
    kmNecessarios: m.porKm ? roundTo(progresso.restante / m.porKm, 1) : null,
    cenarios,
  };
}

export interface MetaDoDia {
  meta: number;
  faturado: number;
  restante: number;
  /** Quanto passou da meta (0 enquanto não bateu). */
  excedente: number;
  percentual: number | null;
  atingida: boolean;
  porHora: number | null;
  porKm: number | null;
  /** Horas que ainda faltam no R$/hora de hoje. */
  horasRestantes: number | null;
}

/** Contador regressivo da meta de hoje. */
export function metaDoDia(input: {
  meta: number;
  faturado: number;
  horas: number;
  km: number;
}): MetaDoDia {
  const restante = money(Math.max(input.meta - input.faturado, 0));
  const porHora = input.horas > 0 ? safeDiv(input.faturado, input.horas, 2) : null;
  return {
    meta: money(input.meta),
    faturado: money(input.faturado),
    restante,
    excedente: money(Math.max(input.faturado - input.meta, 0)),
    percentual: safeDiv(input.faturado * 100, input.meta, 2),
    atingida: input.meta > 0 && input.faturado >= input.meta,
    porHora,
    porKm: input.km > 0 ? safeDiv(input.faturado, input.km, 4) : null,
    horasRestantes: restante > 0 && porHora && porHora > 0 ? roundTo(restante / porHora, 2) : restante === 0 ? 0 : null,
  };
}

// ---------------------------------------------------------------------------
// Lucro real

export interface CustosPorKm {
  manutencao: number;
  pneus: number;
  revisao: number;
  outros: number;
}

export interface LucroEstimado {
  receitaBruta: number;
  combustivel: number;
  /** Custos por km (manutenção, pneus, revisão, outros) + despesas lançadas. */
  outrosCustos: number;
  custoTotal: number;
  lucro: number;
  lucroPorHora: number | null;
  lucroPorKm: number | null;
}

/**
 * Lucro líquido estimado: receita − combustível − custos por km − despesas.
 *
 * É uma estimativa de propósito separada do "disponível" do fechamento: lá, a
 * manutenção já sai pela reserva do veículo; aqui o motorista vê o custo de
 * rodar cada km descontado de uma vez, que é a pergunta "quanto eu ganhei de
 * verdade rodando hoje?".
 */
export function lucroEstimado(input: {
  faturamento: number;
  km: number;
  horas: number;
  combustivel: number;
  despesas?: number;
  custosPorKm: CustosPorKm;
}): LucroEstimado {
  const porKm =
    input.custosPorKm.manutencao + input.custosPorKm.pneus + input.custosPorKm.revisao + input.custosPorKm.outros;
  const combustivel = money(input.combustivel);
  const outrosCustos = money(porKm * input.km + (input.despesas ?? 0));
  const custoTotal = money(combustivel + outrosCustos);
  const lucro = money(input.faturamento - custoTotal);
  return {
    receitaBruta: money(input.faturamento),
    combustivel,
    outrosCustos,
    custoTotal,
    lucro,
    lucroPorHora: input.horas > 0 ? safeDiv(lucro, input.horas, 2) : null,
    lucroPorKm: input.km > 0 ? safeDiv(lucro, input.km, 4) : null,
  };
}

// ---------------------------------------------------------------------------
// Indicadores e avaliação

export type Farol = 'verde' | 'amarelo' | 'vermelho';

export interface Limites {
  /** Abaixo disto: vermelho. */
  vermelhoAbaixo: number;
  /** Acima disto: verde. Entre os dois: amarelo. */
  verdeAcima: number;
}

/** Abaixo de 30 = vermelho, 30 a 40 = amarelo, acima de 40 = verde. */
export function farol(valor: number | null | undefined, limites: Limites): Farol | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  if (valor < limites.vermelhoAbaixo) return 'vermelho';
  if (valor > limites.verdeAcima) return 'verde';
  return 'amarelo';
}

export interface AvaliacaoDia {
  geral: Farol | null;
  titulo: string;
  itens: Array<{ chave: 'porHora' | 'porKm' | 'lucroPorHora'; farol: Farol | null }>;
}

/** "Como foi seu dia": o pior farol entre R$/h, R$/km e lucro/h decide. */
export function avaliarDia(input: {
  porHora: number | null;
  porKm: number | null;
  lucroPorHora: number | null;
  limites: { porHora: Limites; porKm: Limites; lucroPorHora: Limites };
}): AvaliacaoDia {
  const itens = [
    { chave: 'porHora' as const, farol: farol(input.porHora, input.limites.porHora) },
    { chave: 'porKm' as const, farol: farol(input.porKm, input.limites.porKm) },
    { chave: 'lucroPorHora' as const, farol: farol(input.lucroPorHora, input.limites.lucroPorHora) },
  ];
  const avaliados = itens.map((i) => i.farol).filter((f): f is Farol => f !== null);
  const geral: Farol | null =
    avaliados.length === 0
      ? null
      : avaliados.includes('vermelho')
        ? 'vermelho'
        : avaliados.includes('amarelo')
          ? 'amarelo'
          : 'verde';
  const titulo =
    geral === 'verde'
      ? 'Dia bom'
      : geral === 'amarelo'
        ? 'Dia razoável — atenção'
        : geral === 'vermelho'
          ? 'Dia abaixo do esperado'
          : 'Sem dados para avaliar';
  return { geral, titulo, itens };
}

export interface Alerta {
  tipo: 'positivo' | 'info' | 'atencao';
  texto: string;
}

/** Avisos discretos do dia — nada que interrompa, só leitura. */
export function alertasDoDia(input: {
  dia: MetaDoDia;
  porHoraFarol: Farol | null;
  porKmFarol: Farol | null;
  formatar: (v: number) => string;
}): Alerta[] {
  const { dia, formatar } = input;
  const saida: Alerta[] = [];
  if (dia.atingida) {
    saida.push({
      tipo: 'positivo',
      texto:
        dia.excedente > 0
          ? `Meta batida! Você fez ${formatar(dia.excedente)} acima do planejado.`
          : 'Meta batida!',
    });
  } else if (dia.faturado > 0) {
    if (dia.restante <= 100) {
      saida.push({ tipo: 'info', texto: `Faltam ${formatar(dia.restante)} para encerrar a meta de hoje.` });
    } else if ((dia.percentual ?? 0) >= 50) {
      saida.push({ tipo: 'info', texto: '50% da meta de hoje atingida.' });
    }
  }
  if (input.porHoraFarol === 'vermelho') {
    saida.push({ tipo: 'atencao', texto: 'Seu R$/hora está abaixo do limite configurado.' });
  }
  if (input.porKmFarol === 'vermelho') {
    saida.push({ tipo: 'atencao', texto: 'Seu R$/km está abaixo do limite configurado.' });
  }
  return saida;
}
