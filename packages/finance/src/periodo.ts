/**
 * Recortes de período do histórico (seção 19).
 *
 * Aritmética pura sobre datas no formato YYYY-MM-DD, sem fuso e sem hora: o
 * chamador informa qual é "hoje" no fuso do usuário e o resto é contagem de
 * dias. Misturar fuso aqui é como se erra a virada do mês para quem trabalha
 * de madrugada.
 */

export type ChavePeriodo =
  | 'hoje'
  | 'ontem'
  | 'sete_dias'
  | 'trinta_dias'
  | 'mes'
  | 'mes_anterior'
  | 'ano'
  | 'personalizado';

export interface Periodo {
  chave: ChavePeriodo;
  rotulo: string;
  de: string;
  ate: string;
  dias: number;
  /** Janela anterior, para a comparação da seção 13. */
  anterior: { de: string; ate: string; rotulo: string; dias: number };
}

export const PERIODOS: ReadonlyArray<{ chave: ChavePeriodo; rotulo: string }> = [
  { chave: 'hoje', rotulo: 'Hoje' },
  { chave: 'ontem', rotulo: 'Ontem' },
  { chave: 'sete_dias', rotulo: '7 dias' },
  { chave: 'trinta_dias', rotulo: '30 dias' },
  { chave: 'mes', rotulo: 'Este mês' },
  { chave: 'mes_anterior', rotulo: 'Mês passado' },
  { chave: 'ano', rotulo: 'Este ano' },
];

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function paraData(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1));
}

function paraISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function somarDias(iso: string, n: number): string {
  const d = paraData(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return paraISO(d);
}

/** Quantidade de dias no intervalo, contando as duas pontas. */
export function diasNoIntervalo(de: string, ate: string): number {
  return Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86_400_000) + 1;
}

export function rotuloDoMes(iso: string): string {
  const d = paraData(iso);
  return `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/**
 * Semana corrente, de segunda até hoje.
 *
 * Meta semanal zera na virada da semana, então "últimos 7 dias" não serve: o
 * motorista veria a meta encolher no meio da segunda-feira. A semana começa na
 * segunda porque é assim que o brasileiro conta a semana de trabalho.
 */
export function semanaAtual(hoje: string): { de: string; ate: string; diasRestantes: number } {
  const d = paraData(hoje);
  const diaDaSemana = d.getUTCDay(); // 0 = domingo
  const desdeSegunda = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  return {
    de: somarDias(hoje, -desdeSegunda),
    ate: hoje,
    diasRestantes: 7 - desdeSegunda - 1,
  };
}

/** Mês corrente, do dia 1 até hoje, com quantos dias ainda faltam para fechar. */
export function mesAtual(hoje: string): { de: string; ate: string; diasRestantes: number } {
  const d = paraData(hoje);
  const primeiro = paraISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const ultimo = paraISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  return { de: primeiro, ate: hoje, diasRestantes: diasNoIntervalo(hoje, ultimo) - 1 };
}

/**
 * Resolve um período a partir de "hoje" (YYYY-MM-DD no fuso do usuário).
 *
 * A janela de comparação segue duas regras diferentes de propósito: mês
 * compara com o mês-calendário anterior, e o resto compara com uma janela do
 * mesmo tamanho colada antes. Comparar "este mês" com "os 30 dias anteriores"
 * mostraria uma queda enorme todo dia 1º, que não significa nada.
 */
export function resolverPeriodo(
  chave: ChavePeriodo,
  hoje: string,
  personalizado?: { de?: string | undefined; ate?: string | undefined },
): Periodo {
  const h = paraData(hoje);
  let de = hoje;
  let ate = hoje;
  let rotulo = 'Hoje';

  switch (chave) {
    case 'ontem':
      de = ate = somarDias(hoje, -1);
      rotulo = 'Ontem';
      break;
    case 'sete_dias':
      de = somarDias(hoje, -6);
      rotulo = 'Últimos 7 dias';
      break;
    case 'trinta_dias':
      de = somarDias(hoje, -29);
      rotulo = 'Últimos 30 dias';
      break;
    case 'mes':
      de = paraISO(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1)));
      rotulo = rotuloDoMes(de);
      break;
    case 'mes_anterior':
      de = paraISO(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 1)));
      ate = paraISO(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 0)));
      rotulo = rotuloDoMes(de);
      break;
    case 'ano':
      de = paraISO(new Date(Date.UTC(h.getUTCFullYear(), 0, 1)));
      rotulo = String(h.getUTCFullYear());
      break;
    case 'personalizado':
      de = personalizado?.de || somarDias(hoje, -29);
      ate = personalizado?.ate || hoje;
      if (paraData(de) > paraData(ate)) [de, ate] = [ate, de];
      rotulo = 'Período escolhido';
      break;
    case 'hoje':
    default:
      break;
  }

  const anterior =
    chave === 'mes' || chave === 'mes_anterior'
      ? (() => {
          const d = paraData(de);
          const ini = paraISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)));
          const fim = paraISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)));
          return { de: ini, ate: fim, rotulo: rotuloDoMes(ini), dias: diasNoIntervalo(ini, fim) };
        })()
      : (() => {
          const tamanho = diasNoIntervalo(de, ate);
          const fim = somarDias(de, -1);
          const ini = somarDias(fim, -(tamanho - 1));
          return {
            de: ini,
            ate: fim,
            rotulo: tamanho === 1 ? 'dia anterior' : `${tamanho} dias anteriores`,
            dias: tamanho,
          };
        })();

  return { chave, rotulo, de, ate, dias: diasNoIntervalo(de, ate), anterior };
}
