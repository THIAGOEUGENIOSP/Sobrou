'use client';

import { useEffect, useState } from 'react';
import { removerInscricaoPush, salvarInscricaoPush } from '@/lib/notificacoes/actions';

/**
 * Liga/desliga os avisos ativos por notificação (Ajustes).
 *
 * "Suportado" aqui checa três coisas ao mesmo tempo: Service Worker, a API
 * de Notification e o PushManager. Falta uma delas — como no Safari de iOS
 * fora da tela inicial — e o toggle nem aparece, em vez de aparecer e falhar
 * ao tocar.
 */

type Estado = 'verificando' | 'suportado' | 'nao-suportado' | 'negado';

function base64ParaUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Seguro = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = window.atob(base64Seguro);
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

export function NotificacoesToggle({ vapidPublicKey }: { vapidPublicKey: string | undefined }) {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [inscrito, setInscrito] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    async function verificar() {
      const suportado =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!suportado || !vapidPublicKey) {
        setEstado('nao-suportado');
        return;
      }
      if (Notification.permission === 'denied') {
        setEstado('negado');
        return;
      }

      setEstado('suportado');
      const registro = await navigator.serviceWorker.ready.catch(() => null);
      const subscription = await registro?.pushManager.getSubscription().catch(() => null);
      setInscrito(!!subscription);
    }
    verificar();
  }, [vapidPublicKey]);

  async function ativar() {
    if (!vapidPublicKey) return;
    setCarregando(true);
    setMensagem(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setEstado('negado');
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const subscription = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8Array(vapidPublicKey),
      });

      const chaves = subscription.toJSON().keys;
      const resultado = await salvarInscricaoPush({
        endpoint: subscription.endpoint,
        p256dh: chaves?.p256dh,
        auth: chaves?.auth,
      });

      if (!resultado.ok) {
        setMensagem(resultado.erro);
        return;
      }
      setInscrito(true);
      setMensagem('Avisos ativados.');
    } catch {
      setMensagem('Não foi possível ativar os avisos neste aparelho.');
    } finally {
      setCarregando(false);
    }
  }

  async function desativar() {
    setCarregando(true);
    setMensagem(null);
    try {
      const registro = await navigator.serviceWorker.ready;
      const subscription = await registro.pushManager.getSubscription();
      if (subscription) {
        await removerInscricaoPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setInscrito(false);
      setMensagem('Avisos desativados.');
    } catch {
      setMensagem('Não foi possível desativar os avisos neste aparelho.');
    } finally {
      setCarregando(false);
    }
  }

  if (estado === 'verificando') return null;

  if (estado === 'nao-suportado') {
    return (
      <p className="text-sm text-[var(--color-tinta-suave)]">
        Este navegador não aceita notificações push. No iPhone, adicione o Sobrou à tela de
        início pelo Safari para poder ativar.
      </p>
    );
  }

  if (estado === 'negado') {
    return (
      <p className="text-sm text-[var(--color-tinta-suave)]">
        As notificações estão bloqueadas para o Sobrou nas configurações do navegador. Libere lá
        para poder ativar aqui.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Manutenção vencendo e reserva curta</p>
          <p className="text-sm text-[var(--color-tinta-suave)]">
            Um aviso por dia, só quando houver algo que precise da sua atenção.
          </p>
        </div>
        <button
          type="button"
          onClick={inscrito ? desativar : ativar}
          disabled={carregando}
          className="shrink-0 rounded-full border border-[var(--color-borda)] px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={
            inscrito
              ? undefined
              : { background: 'var(--color-marca)', color: '#fff', borderColor: 'transparent' }
          }
        >
          {inscrito ? 'Desativar' : 'Ativar'}
        </button>
      </div>
      {mensagem && <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">{mensagem}</p>}
    </div>
  );
}
