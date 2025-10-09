// Simple service worker for Founder PWA
const CACHE_NAME = "founder-cache-v1";
const OFFLINE_URL = "/offline.html";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

// Network-first for navigation; cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const network = await fetch(request);
        return network;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(OFFLINE_URL);
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" }});
      }
    })());
    return;
  }

  // Static assets: cache-first
  if (ASSETS.some(path => request.url.endsWith(path))) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }
});
