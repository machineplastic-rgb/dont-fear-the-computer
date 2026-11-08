// Service worker: el juego funciona sin conexión tras la primera carga.
const CACHE_NAME = 'dftc-v11';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'js/core.js', 'js/font.js', 'js/gfx.js', 'js/art.js', 'js/deskart.js', 'js/draws.js', 'js/audio.js', 'js/ui.js',
  'js/levels.js', 'js/scenes_intro.js', 'js/scenes_menu.js', 'js/game.js', 'js/micro.js', 'js/part2.js', 'js/p2_antivirus.js', 'js/p2_download.js', 'js/p2_popbreaker.js', 'js/p2_taskmgr.js', 'js/p2_cascade.js', 'js/p2_shred.js', 'js/p2_dialup.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];
const FONT_CACHE = 'dftc-fonts';

self.addEventListener('install', (e) => {
  // 'reload': baja los archivos nuevos del servidor, no los que el navegador tenga guardados
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // primero caché, y se actualiza en segundo plano
    e.respondWith(
      caches.open(CACHE_NAME).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  } else if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(FONT_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; })))
    );
  }
});
