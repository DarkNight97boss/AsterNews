/* Service worker ASTER News: notifiche push e cache leggera delle risorse statiche (installabile come PWA). */
const CACHE = 'aster-v3';
// In sviluppo i file di /_next/static hanno nomi fissi: servirli dalla cache mostrerebbe stili e script vecchi. In produzione i nomi contengono l'impronta del contenuto, quindi la cache è sicura.
const DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname);
self.addEventListener('install', (e) => { e.waitUntil(caches.open('aster-offline').then((c) => c.add('/offline').catch(() => {}))); });
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith('aster-offline')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Pagine: rete prima, poi gli articoli salvati offline, infine la pagina /offline
  if (e.request.mode === 'navigate') { e.respondWith(fetch(e.request).then((res) => { if (res.ok && !url.pathname.startsWith('/admin')) caches.open('aster-offline-visited').then((c) => c.put(e.request, res.clone())); return res; }).catch(async () => (await caches.match(e.request, { cacheName: 'aster-offline' })) || (await caches.match(e.request, { cacheName: 'aster-offline-visited' })) || (await caches.match('/offline')) || Response.error())); return; }
  if (!DEV && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon') || url.pathname === '/favicon.ico')) {
    e.respondWith(caches.open(CACHE).then(async (c) => { const hit = await c.match(e.request); if (hit) return hit; const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res; }));
  }
});
self.addEventListener('push', (e) => {
  let d = { title: 'Ultim\'ora', body: '', url: '/', icon: '/icon.png' };
  try { d = { ...d, ...e.data.json() }; } catch { d.body = e.data ? e.data.text() : ''; }
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: d.icon, image: d.image, badge: '/icon.png', tag: d.tag || 'aster-news', renotify: true, data: { url: d.url } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => { for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
