/* Massenstromrechner – Service Worker v5
   - Network-first fuer index.html
   - Worker/Analytics URLs werden NIE gecacht → immer direkter Netzwerkaufruf
   - Assets gecacht fuer Offline-Betrieb
*/
const CACHE = 'massenstrom-v6';
const CACHE_ASSETS = [
  './manifest.json','./icon-192.svg','./icon-512.svg','./favicon.svg',
];

/* URLs die NIEMALS gecacht werden sollen (Analytics, externe APIs) */
const NEVER_CACHE = [
  'workers.dev',
  'cloudflare',
  'analytics',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  /* Analytics / Worker URLs: immer direkt ans Netz, nie cachen */
  if (NEVER_CACHE.some(pattern => url.includes(pattern))) {
    e.respondWith(fetch(e.request));
    return;
  }

  /* Google Fonts: Cache-first */
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(cached =>
          cached || fetch(e.request).then(res => {
            c.put(e.request, res.clone()); return res;
          })
        )
      )
    );
    return;
  }

  /* index.html: Network-first → frische Version, Offline-Fallback */
  if (e.request.mode === 'navigate' ||
      url.endsWith('/') || url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Alle anderen: Cache-first mit Network-Fallback */
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
    )
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
