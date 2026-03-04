/// <reference lib="webworker" />
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const CACHE_NAME = 'pax-fluxia-v2';

// Assets to pre-cache on install
const PRECACHE_URLS = [
    '/',
    '/favicon.png'
];

sw.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    sw.clients.claim();
});

sw.addEventListener('fetch', (event) => {
    // Network-first strategy: try network, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful GET responses
                if (event.request.method === 'GET' && response.status === 200 && event.request.url.startsWith('http')
                    && !event.request.url.includes('/sounds/')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request).then((r) => r || new Response('Offline', { status: 503 })))
    );
});
