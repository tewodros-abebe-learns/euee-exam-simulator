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
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache item failed, will cache on demand:', err);
      });
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
    }).then(() => self.clients.claim())
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
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Fonts, Images, KaTeX CDN): Stale-While-Revalidate
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
          // Network failed; if we have cached response, return it, else fail gracefully
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
