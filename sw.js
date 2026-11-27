/* TicTac – service worker : garde la page en cache pour l'ouvrir sans réseau.
   À placer dans le même dossier que TicTac.html. Aucune donnée saisie ne passe par ici :
   les entrées restent dans le stockage du navigateur (localStorage). */
const CACHE = 'tictac-v2';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* Met en cache la ou les pages qui ont enregistré ce service worker */
    const wins = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const urls = new Set(wins.map(w => w.url.split('#')[0]).filter(u => u.startsWith(self.registration.scope)));
    await Promise.all([...urls].map(u => cache.add(new Request(u, {cache: 'reload'})).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

/* Page : réseau d'abord (une nouvelle version est visible dès l'ouverture), avec repli sur le cache
   si le réseau ne répond pas en 2,5 s ou si l'appareil est hors ligne. Autres fichiers : cache d'abord. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromCache = async () => (await cache.match(req, {ignoreSearch: nav})) ||
      (nav ? (async () => { const k = (await cache.keys()).find(r => /\.html?$|\/$/.test(new URL(r.url).pathname)); return k ? cache.match(k) : undefined; })() : undefined);
    const fresh = fetch(req, nav ? {cache: 'no-store'} : undefined).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    });
    if (nav) {
      const timeout = new Promise(r => setTimeout(r, 2500));
      const res = await Promise.race([fresh.catch(() => undefined), timeout]);
      if (res) return res;
      const cached = await fromCache();
      if (cached) { event.waitUntil(fresh.catch(() => {})); return cached; }
      return fresh;
    }
    const hit = await fromCache();
    if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  })());
});
