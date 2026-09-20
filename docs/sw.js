// Hok Gong — service worker.
//
// This origin (robertwalterj.github.io) is shared with Landfall, Palimpsest,
// Halyard and the rest, so CacheStorage is SHARED: never use the global
// caches.match(), and never delete a cache that is not ours.
//
// The app is one HTML file plus 545 recordings. Network first for the page, so
// a new deploy arrives on the next open with signal; cache first for the
// recordings, which never change and are the slow part on a phone.

const VERSION = "hokgong-v1-d0d6303-202609202031";   // stamped per deploy by make-deploy.mjs
const PREFIX = 'hokgong-';
// The recordings live in their own cache and survive a deploy: they are 16 MB
// and they never change, so clearing them with the page would mean a phone
// re-downloading the lot every time a typo is fixed.
const AUDIO_CACHE = PREFIX + 'audio-v1';
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== VERSION && k !== AUDIO_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // A recording is the same file forever: serve it from the cache if it is
  // there, and keep it across deploys rather than downloading 16 MB again.
  const isAudio = url.pathname.endsWith('.mp3');
  e.respondWith((async () => {
    const c = await caches.open(isAudio ? AUDIO_CACHE : VERSION);
    if (isAudio) {
      const hit = await c.match(req);
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch {
      return (await c.match(req)) || (req.mode === 'navigate' ? await (await caches.open(VERSION)).match('index.html') : undefined) || Response.error();
    }
  })());
});
