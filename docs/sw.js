// Hok Gong — service worker.
//
// This origin (robertwalterj.github.io) is shared with Landfall, Palimpsest,
// Halyard and the rest, so CacheStorage is SHARED: never use the global
// caches.match(), and never delete a cache that is not ours.
//
// The app is one HTML file plus 545 recordings. Network first for the page, so
// a new deploy arrives on the next open with signal; cache first for the
// recordings, which never change and are the slow part on a phone.

const VERSION = "hokgong-v1-9918bf5-202610080106";   // stamped per deploy by make-deploy.mjs
const PREFIX = 'hokgong-';
// The recordings live in their own cache and survive a deploy: they are 16 MB
// and they never change, so clearing them with the page would mean a phone
// re-downloading the lot every time a typo is fixed.
const AUDIO_CACHE = PREFIX + 'audio-v1';
// The word list, like the recordings: large, and the same file forever once
// its contents are fixed, because its name carries a hash of them. Kept out of
// the versioned cache so a deploy that only changes the code does not throw
// away four megabytes the phone already has.
const DECK_CACHE = PREFIX + 'deck-v1';
// Which word list is the current one, stamped per deploy. Only this one is
// kept: a superseded deck is four megabytes of words nobody is being asked.
const DECK_FILE = "deck-56861b9a13.json";   // stamped per deploy by make-deploy.mjs
// The manifest is deliberately NOT in here, and the fetch handler below never
// puts it in a cache either. Every app on this origin shares Chrome's install
// records and those are keyed on the manifest's `id`; a stale cached manifest
// is how one app comes to answer to another's identity, which is the failure
// that has cost the most time across these apps. It is a small file, fetched
// fresh every time.
const PRECACHE = ['./', 'index.html', 'icons/icon-192.png', 'icons/icon-512.png'];
const NEVER_CACHE = (pathname) => pathname.endsWith('manifest.webmanifest');

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})));
    // The word list too. The home screen promises the app works with no
    // signal, and without the word list it does not work at all — so it is
    // fetched while the phone still has a connection rather than on the first
    // round, which may be on a train. Its own cache, and a failure here never
    // blocks the install.
    try {
      const dc = await caches.open(DECK_CACHE);
      if (!(await dc.match('data/' + DECK_FILE))) await dc.add('data/' + DECK_FILE);
    } catch { /* it will be fetched when the app asks for it */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== VERSION && k !== AUDIO_CACHE && k !== DECK_CACHE) await caches.delete(k);
    // And inside our own deck cache, drop every word list but the current one.
    const dc = await caches.open(DECK_CACHE);
    for (const req of await dc.keys()) if (!req.url.endsWith('/' + DECK_FILE)) await dc.delete(req);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // Straight to the network, never stored. See NEVER_CACHE above.
  if (NEVER_CACHE(url.pathname)) return;
  // A recording is the same file forever: serve it from the cache if it is
  // there, and keep it across deploys rather than downloading 16 MB again.
  const isAudio = url.pathname.endsWith('.mp3');
  // A hashed deck file never changes under its own name, so it is served from
  // the cache without asking the network — the same treatment as a recording.
  const isDeck = /\/data\/deck-[0-9a-f]+\.json$/.test(url.pathname);
  e.respondWith((async () => {
    const c = await caches.open(isAudio ? AUDIO_CACHE : isDeck ? DECK_CACHE : VERSION);
    if (isAudio || isDeck) {
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
