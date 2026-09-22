import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Cotas de uso das operações caras (seção 20).
 *
 * Duas regras de projeto:
 *
 * 1. O contador vive no banco, não na memória do processo. Na Vercel cada
 *    requisição pode cair numa instância diferente; contador em memória
 *    viraria "N por instância", que não é limite nenhum.
 *
 * 2. Se a checagem falhar por erro de infraestrutura, a chamada PASSA. Cota é
 *    proteção contra abuso, não controle de acesso — quem faz esse papel é a
 *    RLS e o `can()`. Travar o motorista por causa de um hiccup do banco seria
 *    trocar um problema pequeno por um grande.
 */

export const COTAS = {
  /** Planilha é a operação mais pesada do app. */
  export: { max: 30, janelaSegundos: 3600 },
  /** Exportação LGPD lê a base inteira do usuário. */
  export_lgpd: { max: 5, janelaSegundos: 3600 },
  /** Destrutivo e irreversível: cota apertada por segurança, não por custo. */
  excluir_conta: { max: 3, janelaSegundos: 3600 },
} as const;

export type Balde = keyof typeof COTAS;

export interface ResultadoCota {
  permitido: boolean;
  restante: number;
  liberaEm: Date | null;
}

export async function consumirCota(balde: Balde): Promise<ResultadoCota> {
  const { max, janelaSegundos } = COTAS[balde];
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('consumir_cota', {
    p_bucket: balde,
    p_max: max,
    p_janela_segundos: janelaSegundos,
  });

  if (error || !data || data.length === 0) {
    return { permitido: true, restante: max, liberaEm: null };
  }

  const linha = data[0]!;
  return {
    permitido: linha.permitido,
    restante: linha.restante,
    liberaEm: linha.libera_em ? new Date(linha.libera_em) : null,
  };
}

/** Mensagem pronta para a tela quando a cota estoura. */
export function mensagemDeCota(r: ResultadoCota): string {
  if (!r.liberaEm) return 'Muitas tentativas. Tente de novo mais tarde.';
  const hora = r.liberaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `Você fez muitas tentativas seguidas. Tente de novo a partir das ${hora}.`;
}
