const CACHE_NAME = 'magicvoca-pwa-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for analytics, API endpoints, and specific problematic files
  if (event.request.url.includes('node_modules') ||
    event.request.url.includes('lucide-react') ||
    event.request.url.includes('.pnpm') ||
    event.request.url.includes('?v=') ||
    event.request.url.includes('goatcounter.com') ||
    event.request.url.includes('gc.zgo.at') ||
    event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch((error) => {
          // Allow the network error to propagate naturally 
          // instead of masking it as a 404 response
          throw error;
        });
      })
  );
});
