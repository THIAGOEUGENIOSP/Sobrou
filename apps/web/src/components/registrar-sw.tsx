'use client';

import { useEffect, useState } from 'react';

/**
 * Registra o service worker e avisa quando o aparelho fica sem rede.
 *
 * O aviso importa mais do que parece: sem ele, o motorista preenche o
 * fechamento do turno inteiro numa área sem sinal e só descobre no botão de
 * salvar. Melhor avisar antes de ele digitar.
 */
export function RegistrarServiceWorker() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Falhar aqui não pode quebrar o app: PWA é melhoria, não requisito.
      });
    }

    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();

    window.addEventListener('online', atualizar);
    window.addEventListener('offline', atualizar);
    return () => {
      window.removeEventListener('online', atualizar);
      window.removeEventListener('offline', atualizar);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 px-4 py-2 text-center text-sm font-medium"
      style={{ background: 'var(--color-alerta)', color: '#fff' }}
    >
      Sem conexão. O que você digitar agora não será salvo.
    </div>
  );
}
