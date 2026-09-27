import 'server-only';

import webpush from 'web-push';
import { publicEnv, vapidPrivateKey, vapidSubject } from '@/lib/env';

/**
 * Envio de notificação push (seção "Avisos ativos" do roadmap).
 *
 * O navegador entrega o Sobrou como PWA, então "notificar o motorista" não
 * pode depender dele estar com o app aberto. Push é o único jeito de um
 * aviso (manutenção vencendo, reserva curta) chegar mesmo assim — o
 * service worker recebe o evento e mostra a notificação mesmo com o app
 * fechado ou o navegador em segundo plano.
 */

export interface PushSubscriptionJSON {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PayloadNotificacao {
  titulo: string;
  corpo: string;
  /** Agrupa avisos do mesmo tipo: uma notificação nova substitui a anterior em vez de acumular. */
  tag: string;
  /** Rota do app para abrir ao tocar na notificação. */
  url: string;
}

/**
 * Resultado de um envio: diz se a inscrição está morta (410/404 — o
 * navegador cancelou ou o endpoint expirou) para que o chamador a remova do
 * banco em vez de tentar de novo no próximo dia.
 */
export type ResultadoEnvio = { ok: true } | { ok: false; inscricaoInvalida: boolean };

export async function enviarPush(
  subscription: PushSubscriptionJSON,
  payload: PayloadNotificacao,
): Promise<ResultadoEnvio> {
  webpush.setVapidDetails(
    vapidSubject(),
    publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    vapidPrivateKey(),
  );

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (erro) {
    const statusCode = (erro as { statusCode?: number }).statusCode;
    // 404/410: o navegador ou o serviço de push já descartou essa inscrição.
    const inscricaoInvalida = statusCode === 404 || statusCode === 410;
    return { ok: false, inscricaoInvalida };
  }
}
