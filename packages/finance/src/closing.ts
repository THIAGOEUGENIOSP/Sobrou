import { distribuir, type Distribuicao } from './allocation';
import { money } from './money';
import { calcularTurno, type ShiftInput, type ShiftResult } from './shift';
import type { AllocationConfig, ReserveKind } from './types';

/**
 * Fechamento do turno (seção 12): junta cálculo e distribuição num único
 * resultado, que é o que a tela mostra e o que vira snapshot no banco.
 *
 * Esta é a função que o servidor chama ao finalizar um turno. Nenhuma tela
 * recalcula nada por conta própria: é daqui que sai o número, uma vez só.
 */

export interface FechamentoDiario {
  turno: ShiftResult;
  distribuicao: Distribuicao;
  /** Créditos a lançar no livro-razão das reservas. */
  creditosReserva: Array<{ reserveKind: ReserveKind; valor: number }>;
  /** Exatamente o que vai para as colunas snap_* da tabela `shifts`. */
  snapshot: {
    km: number;
    horas: number | null;
    litros: number | null;
    faturamento: number;
    custoCombustivel: number;
    outrasDespesas: number;
    resultadoOperacional: number;
    reservaVeiculo: number;
    reservaEmergencia: number;
    disponivel: number;
    /** Total de corridas do turno — null quando nenhuma corrida informou
     * quantidade (o campo é opcional no lançamento). */
    qtdCorridas: number | null;
  };
}

export function fecharTurno(
  input: ShiftInput,
  config: AllocationConfig,
): FechamentoDiario {
  const turno = calcularTurno(input);
  const distribuicao = distribuir(turno.resultadoOperacional, config);

  const creditosReserva = (
    [
      { reserveKind: 'veiculo' as const, valor: distribuicao.reservaVeiculo },
      { reserveKind: 'emergencia' as const, valor: distribuicao.reservaEmergencia },
    ] satisfies Array<{ reserveKind: ReserveKind; valor: number }>
  ).filter((c) => c.valor > 0);

  return {
    turno,
    distribuicao,
    creditosReserva,
    snapshot: {
      km: turno.km,
      horas: turno.horas,
      litros: turno.litros,
      faturamento: turno.faturamento,
      custoCombustivel: turno.custoCombustivel,
      outrasDespesas: turno.outrasDespesas,
      resultadoOperacional: turno.resultadoOperacional,
      reservaVeiculo: distribuicao.reservaVeiculo,
      reservaEmergencia: distribuicao.reservaEmergencia,
      disponivel: distribuicao.disponivel,
      qtdCorridas: turno.qtdCorridas,
    },
  };
}

/**
 * Confere que a distribuição fecha: as três partes têm de somar a base,
 * sem sobrar nem faltar centavo. Roda nos testes e como asserção do servidor.
 */
export function conferirFechamento(f: FechamentoDiario): { ok: boolean; diferenca: number } {
  const { base, reservaVeiculo, reservaEmergencia, disponivel, prejuizo } = f.distribuicao;
  const soma = money(reservaVeiculo + reservaEmergencia + disponivel);
  const esperado = prejuizo ? money(f.turno.resultadoOperacional) : base;
  const diferenca = money(soma - esperado);
  return { ok: diferenca === 0, diferenca };
}
