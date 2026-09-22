import 'server-only';

import { z } from 'zod';
import type { FuelEntry } from '@sobrou/finance';
import { createAnonClient } from '@/lib/supabase/server';
import { hashToken, tokenDoCabecalho } from './token';
import { baseDeCusto, regrasDaLinha, type BaseDeCusto } from '@/lib/corridas/custo';
import { paraFuelEntry } from '@/lib/dados/contexto';
import type { Tables } from '@/lib/supabase/database.types';

/**
 * Contexto de uma requisição vinda do app Android.
 *
 * O banco devolve linhas; a conta continua sendo feita aqui, com o mesmo
 * `@sobrou/finance` da tela do navegador. Reescrever a fórmula em SQL para
 * atender o celular seria o começo de o app e o site discordarem sobre a
 * mesma corrida.
 */

export interface ContextoDispositivo {
  permiteAnalisador: boolean;
  custo: BaseDeCusto;
  regras: ReturnType<typeof regrasDaLinha>;
  regrasLinha: Tables<'ride_rules'> | null;
  veiculo: Tables<'vehicles'> | null;
  turnoAberto: string | null;
  hash: string;
}

/** Erro com o código HTTP que a rota deve devolver. */
export class ErroDispositivo extends Error {
  constructor(
    readonly status: number,
    readonly mensagem: string,
  ) {
    super(mensagem);
  }
}

const contextoSchema = z.object({
  plano_permite_analisador: z.boolean(),
  settings: z.any().nullable(),
  veiculo: z.any().nullable(),
  regras: z.any().nullable(),
  abastecimentos: z.array(z.any()),
  manutencoes_12m: z.coerce.number(),
  km_12m: z.coerce.number(),
  turno_aberto: z.string().nullable(),
});

export async function carregarDispositivo(
  authorization: string | null,
): Promise<ContextoDispositivo> {
  const token = tokenDoCabecalho(authorization);
  if (!token) throw new ErroDispositivo(401, 'Token ausente ou mal formado.');

  const hash = hashToken(token);
  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc('dispositivo_contexto', { p_hash: hash });

  // Token desconhecido e token revogado devolvem a mesma coisa de propósito:
  // quem está sondando não descobre se acertou uma conta existente.
  if (error || data === null) throw new ErroDispositivo(401, 'Token inválido ou revogado.');

  const parsed = contextoSchema.safeParse(data);
  if (!parsed.success) throw new ErroDispositivo(500, 'Contexto do aparelho inconsistente.');

  const abastecimentos: FuelEntry[] = parsed.data.abastecimentos.map((linha) =>
    paraFuelEntry(linha as Tables<'fuel_entries'>),
  );

  return {
    permiteAnalisador: parsed.data.plano_permite_analisador,
    custo: baseDeCusto({
      veiculo: parsed.data.veiculo as Tables<'vehicles'> | null,
      settings: parsed.data.settings as Tables<'user_settings'> | null,
      abastecimentos,
      totalManutencoes12m: parsed.data.manutencoes_12m,
      kmRodados12m: parsed.data.km_12m,
    }),
    regras: regrasDaLinha(parsed.data.regras as Tables<'ride_rules'> | null),
    regrasLinha: parsed.data.regras as Tables<'ride_rules'> | null,
    veiculo: parsed.data.veiculo as Tables<'vehicles'> | null,
    turnoAberto: parsed.data.turno_aberto,
    hash,
  };
}
