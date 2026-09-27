/**
 * Service worker do Sobrou.
 *
 * O que ele faz: deixa o app abrir sem rede, servindo a casca (CSS, JS,
 * ícones) do cache e uma página de aviso quando o motorista está numa área
 * sem sinal.
 *
 * O que ele NÃO faz, de propósito: guardar página autenticada em cache.
 * O HTML do app carrega faturamento, reservas e o nome da pessoa. Se ficasse
 * no cache do disco, o próximo a abrir o app naquele aparelho — ou a mesma
 * pessoa depois de sair da conta — veria os números de outro usuário. Cache de
 * arquivo estático é conveniência; cache de página logada é vazamento.
 *
 * Fila de envio offline (registrar abastecimento sem sinal e sincronizar
 * depois) é a próxima etapa: exige IndexedDB e tratamento de conflito, e feita
 * pela metade ela perde lançamento — que é pior do que não ter.
 */

const VERSAO = 'sobrou-v2';
const CASCA = `${VERSAO}-casca`;
const ESTATICOS = `${VERSAO}-estaticos`;

const OFFLINE = '/offline';

const PRECACHE = [
  OFFLINE,
  '/icons/icone-192.png',
  '/icons/icone-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CASCA)
      // addAll falha inteiro se um arquivo falhar; aqui cada um é opcional,
      // porque um ícone ausente não pode impedir o worker de instalar.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((c) => !c.startsWith(VERSAO))
            .map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Sair da conta limpa tudo que este worker guardou. */
self.addEventListener('message', (event) => {
  if (event.data === 'limpar-cache') {
    event.waitUntil(caches.keys().then((cs) => Promise.all(cs.map((c) => caches.delete(c)))));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Só GET. POST de Server Action nunca passa por cache.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Autenticação e rotas de dados sempre vão à rede.
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return;

  // Arquivos com hash no nome do Next: imutáveis, cache primeiro.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheEntaoRede(request, ESTATICOS));
    return;
  }

  // Navegação: rede primeiro, e a página de offline como último recurso.
  // Nenhuma resposta de navegação é guardada — ver o comentário do topo.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CASCA);
        const offline = await cache.match(OFFLINE);
        return (
          offline ??
          new Response('<h1>Sem conexão</h1>', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        );
      }),
    );
  }
});

async function cacheEntaoRede(request, nomeCache) {
  const cache = await caches.open(nomeCache);
  const guardado = await cache.match(request);
  if (guardado) return guardado;

  const resposta = await fetch(request);
  if (resposta.ok && resposta.status === 200) {
    cache.put(request, resposta.clone());
  }
  return resposta;
}

/**
 * Avisos ativos (manutenção vencendo, reserva curta): o job diário manda o
 * push, este listener é quem de fato mostra a notificação no aparelho. Sem
 * isso o navegador recebe o push e não faz nada com ele — `showNotification`
 * é obrigatório aqui dentro do `waitUntil`, senão o Chrome mostra uma
 * notificação genérica de "isso aconteceu em segundo plano" no lugar.
 */
self.addEventListener('push', (event) => {
  let dados = { titulo: 'Sobrou', corpo: 'Você tem uma novidade no app.', url: '/app' };
  try {
    const recebido = event.data ? event.data.json() : null;
    if (recebido) dados = { ...dados, ...recebido };
  } catch {
    // Payload sem JSON válido: fica com o texto padrão em vez de falhar.
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      tag: dados.tag,
      icon: '/icons/icone-192.png',
      badge: '/icons/icone-192.png',
      data: { url: dados.url || '/app' },
    }),
  );
});

/** Tocar na notificação abre o app na tela do aviso, reaproveitando uma aba já aberta. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          janela.navigate(destino);
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
