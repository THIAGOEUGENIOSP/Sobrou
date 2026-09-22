import { applyPercent, money } from './money';
import type { AllocationConfig } from './types';

/**
 * Distribuição do resultado entre disponível, emergência e reserva do veículo
 * (seção 7), e o livro-razão das reservas (seção 8).
 *
 * O padrão sugerido é 70/10/20, mas nada aqui fixa esses números: os
 * percentuais vêm sempre da configuração do usuário, versionada no banco.
 */

export const ALLOCATION_PADRAO: AllocationConfig = {
  pctDisponivel: 70,
  pctEmergencia: 10,
  pctVeiculo: 20,
};

export interface ValidacaoPercentuais {
  valido: boolean;
  soma: number;
  erros: string[];
}

/** A soma precisa ser exatamente 100. Validado no cliente e de novo no servidor. */
export function validarPercentuais(config: AllocationConfig): ValidacaoPercentuais {
  const erros: string[] = [];
  const valores: Array<[string, number]> = [
    ['disponível', config.pctDisponivel],
    ['emergência', config.pctEmergencia],
    ['veículo', config.pctVeiculo],
  ];

  for (const [nome, valor] of valores) {
    if (!Number.isFinite(valor)) erros.push(`Percentual de ${nome} inválido.`);
    else if (valor < 0) erros.push(`Percentual de ${nome} não pode ser negativo.`);
    else if (valor > 100) erros.push(`Percentual de ${nome} não pode passar de 100%.`);
  }

  const soma = money(config.pctDisponivel + config.pctEmergencia + config.pctVeiculo);
  if (erros.length === 0 && soma !== 100) {
    erros.push(`Os percentuais somam ${soma}%. A soma precisa ser exatamente 100%.`);
  }

  return { valido: erros.length === 0, soma, erros };
}

export interface Distribuicao {
  /** Base de cálculo: o resultado operacional, nunca negativo. */
  base: number;
  reservaVeiculo: number;
  reservaEmergencia: number;
  /** O que sobra de fato para o motorista. Fica negativo em dia de prejuízo. */
  disponivel: number;
  /** true quando o dia fechou no vermelho: nada é reservado. */
  prejuizo: boolean;
  config: AllocationConfig;
}

/**
 * Distribui o resultado operacional.
 *
 * Dois cuidados que evitam bug de centavo e de dia ruim:
 *
 * 1. As reservas são arredondadas e o **disponível recebe o resto**. Assim a
 *    soma das três partes bate sempre com a base, sem sobrar ou faltar centavo.
 * 2. Resultado negativo não gera reserva nenhuma. Guardar dinheiro num dia de
 *    prejuízo seria criar reserva com dinheiro que não existe; o prejuízo
 *    aparece inteiro no disponível, em vermelho.
 */
export function distribuir(
  resultadoOperacional: number,
  config: AllocationConfig = ALLOCATION_PADRAO,
): Distribuicao {
  const validacao = validarPercentuais(config);
  if (!validacao.valido) {
    throw new Error(validacao.erros.join(' '));
  }

  if (resultadoOperacional < 0) {
    return {
      base: 0,
      reservaVeiculo: 0,
      reservaEmergencia: 0,
      disponivel: money(resultadoOperacional),
      prejuizo: true,
      config,
    };
  }

  const base = money(resultadoOperacional);
  const reservaVeiculo = applyPercent(base, config.pctVeiculo);
  const reservaEmergencia = applyPercent(base, config.pctEmergencia);
  const disponivel = money(base - reservaVeiculo - reservaEmergencia);

  return { base, reservaVeiculo, reservaEmergencia, disponivel, prejuizo: false, config };
}
