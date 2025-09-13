// sw.js - Service Worker básico
const CACHE_NAME = 'evolution-api-manager-v1';
const urlsToCache = [
  '/',
  '/style.css',
  '/script.js',
  '/evolution-api.js',
  '/utils.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
