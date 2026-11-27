/* TicTac – service worker : garde la page en cache pour l'ouvrir sans réseau.
   À placer dans le même dossier que TicTac.html. Aucune donnée saisie ne passe par ici :
   les entrées restent dans le stockage du navigateur (localStorage). */
const CACHE = 'tictac-v1';

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

/* Cache d'abord (ouverture instantanée, même hors ligne), puis mise à jour en arrière-plan :
   une nouvelle version du fichier sera visible au lancement suivant. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, {ignoreSearch: nav});
    const fresh = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    });
    if (hit) {
      event.waitUntil(fresh.catch(() => {}));
      return hit;
    }
    try { return await fresh; }
    catch (err) {
      if (nav) {
        const any = (await cache.keys()).find(r => /\.html?$|\/$/.test(new URL(r.url).pathname));
        if (any) return cache.match(any);
      }
      throw err;
    }
  })());
});
