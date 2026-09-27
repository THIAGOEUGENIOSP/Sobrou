import 'server-only';

import {
  compararIndicador,
  diasNoIntervalo,
  mesAtual,
  semanaAtual,
  type Comparacao,
} from '@sobrou/finance';
import { carregarPeriodo, type DadosPeriodo } from '@/lib/relatorios/dados';
import { createClient } from '@/lib/supabase/server';
import { dataLocal } from '@/lib/numeros';
import type { ContextoUsuario } from '@/lib/dados/contexto';

/**
 * O consultor (seção nova, set/2026).
 *
 * Diferente do dashboard e dos relatórios, que mostram o que aconteceu, o
 * consultor tenta responder "e daí?" — o que muda a decisão do motorista
 * hoje. Cada insight só aparece quando há dado real por trás: nada de
 * conselho genérico de app de finanças. Sem turno fechado suficiente, a
 * lista vem vazia — e a tela explica isso, em vez de inventar.
 *
 * Tudo aqui é derivado de `@sobrou/finance` e de `carregarPeriodo`, as mesmas
 * fontes do dashboard e dos relatórios: o consultor nunca pode mostrar um
 * R$/km diferente do que a tela "Meu dia" mostrou pro mesmo período.
 */

export type Severidade = 'positivo' | 'aviso' | 'alerta' | 'neutro';

export interface Insight {
  id: string;
  titulo: string;
  corpo: string;
  severidade: Severidade;
  chip?: string;
}

export interface DadosConsultor {
  /** 0–100. null quando não há turnos fechados o bastante para calcular. */
  saudeFinanceira: number | null;
  insights: Insight[];
}

const MARGEM_SAUDAVEL = 0.35; // resultado/faturamento acima disso já é uma operação bem enxuta

function comparacaoCombustivel(atual: DadosPeriodo, anterior: DadosPeriodo): Comparacao | null {
  const a = atual.totais.custoCombustivelPorKm;
  const b = anterior.totais.custoCombustivelPorKm;
  if (a === null || b === null) return null;
  return compararIndicador(a, b);
}

function melhorDiaDaSemana(
  turnos: DadosPeriodo['turnos'],
): { dia: string; rsHora: number; amostras: number } | null {
  const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const porDia = new Map<number, { soma: number; n: number }>();

  for (const t of turnos) {
    const horas = Number(t.snap_horas ?? 0);
    const resultado = Number(t.snap_resultado_op ?? 0);
    if (horas <= 0) continue;
    // work_date é "YYYY-MM-DD" local, sem hora: dá pra ler o dia da semana
    // direto, sem passar por Date (que reintroduziria fuso).
    const [ano, mes, dia] = t.work_date.split('-').map(Number);
    const diaSemana = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1)).getUTCDay();
    const atual = porDia.get(diaSemana) ?? { soma: 0, n: 0 };
    atual.soma += resultado / horas;
    atual.n += 1;
    porDia.set(diaSemana, atual);
  }

  // Só entra na conversa o dia com pelo menos 2 turnos: um turno bom sozinho
  // não é um padrão, é sorte.
  const candidatos = [...porDia.entries()]
    .filter(([, v]) => v.n >= 2)
    .map(([dia, v]) => ({ dia: NOMES[dia] ?? '', rsHora: v.soma / v.n, amostras: v.n }));

  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => b.rsHora - a.rsHora);
  return candidatos[0] ?? null;
}

export async function carregarConsultor(ctx: ContextoUsuario): Promise<DadosConsultor> {
  const supabase = await createClient();
  const hoje = dataLocal(new Date(), ctx.timezone);

  const semana = semanaAtual(hoje);

  // Janela anterior do mesmo tamanho, colada antes da semana atual.
  const duracaoSemana = diasNoIntervalo(semana.de, semana.ate);
  const fimAnterior = somarDiasISO(semana.de, -1);
  const inicioAnterior = somarDiasISO(fimAnterior, -(duracaoSemana - 1));

  const mes = mesAtual(hoje);
  const diasDecorridosNoMes = diasNoIntervalo(mes.de, hoje);

  const [semanaAtualDados, semanaAnteriorDados, mesDados, trintaDiasDados, ultimaManutencao] =
    await Promise.all([
      carregarPeriodo(semana.de, semana.ate),
      carregarPeriodo(inicioAnterior, fimAnterior),
      carregarPeriodo(mes.de, hoje),
      carregarPeriodo(somarDiasISO(hoje, -29), hoje),
      ctx.veiculo
        ? supabase
            .from('maintenances')
            .select('next_km, next_date, performed_at')
            .eq('vehicle_id', ctx.veiculo.id)
            .order('performed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const insights: Insight[] = [];

  // 1) Combustível subiu ou caiu por km, comparado com a semana passada.
  const combustivel = comparacaoCombustivel(semanaAtualDados, semanaAnteriorDados);
  if (combustivel && combustivel.variacao !== null && Math.abs(combustivel.variacao) >= 3) {
    const subiu = combustivel.direcao === 'alta';
    insights.push({
      id: 'combustivel',
      titulo: subiu ? 'Custo de combustível subiu' : 'Custo de combustível caiu',
      corpo: subiu
        ? `Seu custo de combustível por km ficou ${formatPct(combustivel.variacao)} maior essa semana. Confira se o preço que você está usando nos abastecimentos está atualizado.`
        : `Seu custo de combustível por km ficou ${formatPct(Math.abs(combustivel.variacao))} menor essa semana — reflexo de preço mais baixo ou consumo melhor.`,
      severidade: subiu ? 'aviso' : 'positivo',
      chip: formatPctComSinal(combustivel.variacao),
    });
  }

  // 2) Melhor dia da semana, pelos últimos 30 dias.
  const melhorDia = melhorDiaDaSemana(trintaDiasDados.turnos);
  if (melhorDia) {
    insights.push({
      id: 'melhor-dia',
      titulo: `${capitalizar(melhorDia.dia)} costuma ser seu melhor dia`,
      corpo: `Nos últimos 30 dias, ${melhorDia.dia}-feira rendeu em média ${formatMoneySimple(melhorDia.rsHora)}/hora de resultado — a média dos outros dias com turno fechado, em ${melhorDia.amostras} turnos.`,
      severidade: 'neutro',
    });
  }

  // 3) Projeção de fechamento do mês, pelo ritmo já observado.
  if (diasDecorridosNoMes > 0 && mesDados.totais.diasTrabalhados > 0) {
    const mediaDiaria = mesDados.totais.disponivel / diasDecorridosNoMes;
    const projecao = mesDados.totais.disponivel + mediaDiaria * mes.diasRestantes;
    if (mes.diasRestantes > 0) {
      insights.push({
        id: 'projecao-mes',
        titulo: 'Projeção do mês',
        corpo: `No ritmo atual, o mês deve fechar perto de ${formatMoneySimple(projecao)} de disponível — já são ${formatMoneySimple(mesDados.totais.disponivel)} nos ${diasDecorridosNoMes} dias trabalhados até agora.`,
        severidade: 'neutro',
      });
    }
  }

  // 4) Manutenção: só aparece quando existe um "próximo km" registrado.
  const manutencao = ultimaManutencao.data as
    | { next_km: number | null; next_date: string | null; performed_at: string }
    | null;
  if (manutencao?.next_km && ctx.veiculo?.odometro_atual) {
    const faltam = Number(manutencao.next_km) - Number(ctx.veiculo.odometro_atual);
    if (faltam <= 800) {
      insights.push({
        id: 'manutencao',
        titulo: faltam <= 0 ? 'Manutenção já venceu pelo km' : 'Manutenção chegando',
        corpo:
          faltam <= 0
            ? `O hodômetro já passou dos ${formatKmSimples(Number(manutencao.next_km))} previstos pra próxima manutenção.`
            : `Faltam cerca de ${formatKmSimples(faltam)} para a próxima manutenção prevista. Vale reservar o valor com antecedência.`,
        severidade: faltam <= 0 ? 'alerta' : 'aviso',
      });
    }
  }

  // Saúde financeira: margem operacional dos últimos 30 dias, 0–100.
  const saudeFinanceira =
    trintaDiasDados.totais.faturamento > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (trintaDiasDados.totais.resultadoOperacional / trintaDiasDados.totais.faturamento / MARGEM_SAUDAVEL) *
                100,
            ),
          ),
        )
      : null;

  return { saudeFinanceira, insights };
}

function somarDiasISO(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPct(v: number): string {
  return `${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

function formatPctComSinal(v: number): string {
  const sinal = v > 0 ? '+' : '';
  return `${sinal}${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

function formatMoneySimple(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function formatKmSimples(v: number): string {
  return `${Math.round(v).toLocaleString('pt-BR')} km`;
}
