const SHELL = 'tc-shell-v3';
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

  // data.json и drivers.json: сначала сеть (свежая сводка), без связи — последняя сохранённая
  if (url.pathname.endsWith('/data.json') || url.pathname.endsWith('/drivers.json')) {
    const key = url.origin + url.pathname;      // без ?меткой времени, иначе офлайн не найдёт
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(r => {
          const copy = r.clone();
          caches.open('tc-data').then(c => c.put(key, copy));
          return r;
        })
        .catch(() => caches.match(key))
    );
    return;
  }

  // остальное: сначала сеть (чтобы обновления приложения доходили сразу), без связи — из кэша
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(SHELL).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
