const cacheName = "catre-cache";
const assetsToCache = ["/", "/index.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assetsToCache)));
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === cacheName ? Promise.resolve() : caches.delete(key)))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  // Ignore non-GET requests and cross-origin calls (API requests, analytics, etc.)
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  // Deixe chamadas da API seguirem direto (evita problemas com PDFs/recibos)
  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseClone = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => cachedResponse || Response.error());
      return cachedResponse || fetchPromise;
    })
  );
});
