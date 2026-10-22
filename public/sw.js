/**
 * EUEE Exam Simulator - Progressive Web App Service Worker
 * Provides offline application access, background caching, and asset persistence.
 */

const CACHE_VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `euee-pwa-${CACHE_VERSION}`;
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 1. Service Worker Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Individually, not `addAll`: addAll rejects as a unit, so one missing
      // icon would leave the offline shell uncached and the app unusable
      // offline. A missing entry is simply fetched on demand later.
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => cache.add(new Request(asset, { cache: 'reload' })))
      );
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed > 0) {
        console.warn(`${failed} pre-cache item(s) unavailable; they will be cached on demand.`);
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Service Worker Activate & Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
      .then(() => self.clients.claim())
      // Keep the cache from growing forever across releases: entries that no
      // longer exist in the new build are dropped a moment after activation.
      .then(async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          const MAX_CACHED_ENTRIES = 120;
          if (keys.length <= MAX_CACHED_ENTRIES) return;
          for (const request of keys.slice(0, keys.length - MAX_CACHED_ENTRIES)) {
            await cache.delete(request);
          }
        } catch (error) {
          console.warn('Service worker cache prune skipped:', error);
        }
      })
  );
});

// 3. Fetch Strategy: Stale-While-Revalidate for Assets, Network-First for Navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST to /api/)
  if (request.method !== 'GET') {
    return;
  }

  // API responses are live data; never serve them from the cache.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip Firebase Firestore & Auth streaming/long-polling requests (Firestore has its own built-in offline cache)
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('identitytoolkit') || url.hostname.includes('firebase')) {
    return;
  }

  // Navigation requests (HTML SPA pages): Network-First, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only same-origin, successful responses are safe to cache for an SPA shell.
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // Offline and nothing cached: still answer with something the browser
          // can render instead of rejecting the navigation.
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          return (
            cached ||
            new Response(
              '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
                '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
                '<h1>You are offline</h1><p>Reconnect to open the app.</p></body>',
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          );
        })
    );
    return;
  }

  // Everything the app needs at runtime is same-origin (fonts and KaTeX CSS are
  // bundled). Caching arbitrary third-party URLs let the cache grow without a
  // limit and could pin a stale copy of someone else's asset; both are avoided.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Static Assets (JS, CSS, fonts, images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed; serve the cached copy when there is one.
          return cachedResponse;
        });

      if (cachedResponse) return cachedResponse;

      return fetchPromise.then(
        (response) =>
          response ||
          new Response('', { status: 504, statusText: 'Offline' })
      );
    })
  );
});
