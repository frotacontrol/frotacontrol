/* ── EXPRESSO PB — SERVICE WORKER ── */
const CACHE = 'expressopb-frota-v1';
const ASSETS = [
  '/frotacontrol/',
  '/frotacontrol/index.html',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.34.0/dist/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

/* Instala e faz cache dos recursos principais */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.log('Cache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

/* Ativa e limpa caches antigos */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* Intercepta requests — cache first, depois rede */
self.addEventListener('fetch', function(e) {
  /* Requisições ao Google Sheets sempre vão para rede */
  if (e.request.url.indexOf('script.google.com') >= 0) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response('{"ok":false}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        /* Faz cache de recursos estáticos */
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        /* Offline: retorna index.html para navegação */
        if (e.request.mode === 'navigate') {
          return caches.match('/frotacontrol/index.html');
        }
      });
    })
  );
});
