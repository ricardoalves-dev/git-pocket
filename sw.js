const CACHE_NAME = 'git-pocket-v6';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Instala e faz cache de todos os assets.
// Sem skipWaiting() aqui: o SW aguarda o sinal da página antes de assumir o controle.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Remove caches de versões antigas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Recebe a mensagem da página para assumir o controle (após o usuário ser notificado)
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Estratégia: Cache First → fallback para rede
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Ignora esquemas não-cacheáveis (chrome-extension, data:, etc.)
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
