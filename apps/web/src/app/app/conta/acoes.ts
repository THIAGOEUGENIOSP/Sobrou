'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { consumirCota, mensagemDeCota } from '@/lib/cota';
import { registrarErro } from '@/lib/observabilidade';
import type { FormState } from '@/lib/auth/schemas';

/**
 * Direitos do titular (seção 21 / LGPD art. 18).
 *
 * A exportação ignora de propósito o limite de histórico do plano: direito de
 * acesso aos próprios dados não é uma funcionalidade paga.
 */

export async function exportarMeusDados(): Promise<{ json: string } | { erro: string }> {
  // Esta chamada lê a base inteira do usuário. A cota existe para o custo,
  // não para dificultar o direito: cinco exportações por hora não atrapalham
  // ninguém que queira os próprios dados.
  const cota = await consumirCota('export_lgpd');
  if (!cota.permitido) return { erro: mensagemDeCota(cota) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('export_my_data');

  if (error) {
    await registrarErro('Falha ao exportar dados do usuário', { code: error.code });
    return { erro: 'Não foi possível gerar a exportação. Tente novamente.' };
  }
  return { json: JSON.stringify(data, null, 2) };
}

export async function excluirMinhaConta(
  _estado: FormState,
  formData: FormData,
): Promise<FormState> {
  // Confirmação por digitação: exclusão de conta não pode acontecer por um
  // toque errado na tela do celular.
  if (String(formData.get('confirmacao') ?? '').trim().toUpperCase() !== 'EXCLUIR') {
    return { erro: 'Digite EXCLUIR para confirmar.' };
  }

  const cota = await consumirCota('excluir_conta');
  if (!cota.permitido) return { erro: mensagemDeCota(cota) };

  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    await registrarErro('Falha ao excluir conta', { code: error.code });
    return { erro: 'Não foi possível excluir a conta. Tente novamente.' };
  }

  await supabase.auth.signOut();
  redirect('/?conta=excluida');
}
