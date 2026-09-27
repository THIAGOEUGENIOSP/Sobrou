import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { cronSecret } from '@/lib/env';
import { gerarAvisosParaUsuario } from '@/lib/notificacoes/avisos';
import { enviarPush } from '@/lib/notificacoes/push';

export const dynamic = 'force-dynamic';

/**
 * Job diário dos avisos ativos (Fase 3 do roadmap).
 *
 * Chamado só pelo Vercel Cron (vercel.json na raiz do repo), autenticado por
 * `Authorization: Bearer $CRON_SECRET` — o mesmo header que a Vercel injeta
 * automaticamente quando a variável existe no projeto. Sem o header certo, a
 * rota nem consulta o banco: um cron exposto sem isso seria um jeito de
 * qualquer um disparar notificação para todo mundo.
 *
 * Passa por cada usuário que tem ao menos uma inscrição push, calcula os
 * avisos com as mesmas contas do consultor/reservas, e manda um push por
 * inscrição. Inscrição que o navegador já descartou (404/410) é removida do
 * banco aqui — sem isso, o job tentaria de novo para sempre um aparelho que
 * nunca mais vai receber nada.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret()}`) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: inscricoes, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth');

  if (error) {
    return NextResponse.json({ erro: 'falha ao ler inscrições' }, { status: 500 });
  }

  const porUsuario = new Map<string, typeof inscricoes>();
  for (const i of inscricoes ?? []) {
    porUsuario.set(i.user_id, [...(porUsuario.get(i.user_id) ?? []), i]);
  }

  let usuariosComAviso = 0;
  let notificacoesEnviadas = 0;
  const inscricoesParaRemover: string[] = [];

  for (const [userId, inscricoesDoUsuario] of porUsuario) {
    const avisos = await gerarAvisosParaUsuario(userId);
    if (avisos.length === 0) continue;
    usuariosComAviso += 1;

    for (const inscricao of inscricoesDoUsuario ?? []) {
      for (const aviso of avisos) {
        const resultado = await enviarPush(
          { endpoint: inscricao.endpoint, p256dh: inscricao.p256dh, auth: inscricao.auth },
          aviso,
        );
        if (resultado.ok) {
          notificacoesEnviadas += 1;
        } else if (resultado.inscricaoInvalida) {
          inscricoesParaRemover.push(inscricao.id);
        }
      }
    }
  }

  if (inscricoesParaRemover.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', inscricoesParaRemover);
  }

  return NextResponse.json({
    usuariosVerificados: porUsuario.size,
    usuariosComAviso,
    notificacoesEnviadas,
    inscricoesRemovidas: inscricoesParaRemover.length,
  });
}
