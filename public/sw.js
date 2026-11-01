// Service Worker for Seshat Notch Offline Desktop App
const CACHE_NAME = 'seshat-notch-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.svg',
  './logo.svg',
  './icon-192.png',
  './icon-256.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each file individually so a single missing or transient asset cannot fail the whole install
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (response && response.ok) {
              await cache.put(assetUrl, response);
            }
          } catch (err) {
            console.warn('[Seshat SW] Skipped caching asset during install:', assetUrl, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache-first for static same-origin shell assets, bundled self-hosted fonts, and icons
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});
