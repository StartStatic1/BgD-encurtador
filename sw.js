const CACHE_NAME = "bgdv-v5";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", e => {
  if (e.request.url.includes("/encurtar")) return;

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
