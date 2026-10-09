const SHELL = 'tc-shell-v1';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== 'tc-data').map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // data.json: сначала сеть (свежая сводка), если нет связи — последняя сохранённая
  if (url.pathname.endsWith('/data.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(r => {
          const copy = r.clone();
          caches.open('tc-data').then(c => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // остальное: из кэша, в фоне обновляем
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(SHELL).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
