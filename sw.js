// Игра открывается из кэша (работает без интернета), а свежие файлы
// тихо докачиваются в фоне и появятся при следующем запуске.
// При каждом обновлении игры увеличивайте номер версии.
const VERSION = 'allo-lyalya-v2';
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'audio.js', 'characters.js',
  'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => hit);
      if (hit) { e.waitUntil(fresh); return hit; }
      return fresh;
    }),
  );
});
