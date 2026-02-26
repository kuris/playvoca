const CACHE_NAME = 'magicvoca-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for analytics and specific problematic files
  if (event.request.url.includes('node_modules') ||
    event.request.url.includes('lucide-react') ||
    event.request.url.includes('.pnpm') ||
    event.request.url.includes('?v=') ||
    event.request.url.includes('goatcounter.com') ||
    event.request.url.includes('gc.zgo.at')) {
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
