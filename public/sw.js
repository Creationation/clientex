/**
 * Service worker minimal : cache de l'app shell pour un demarrage instantane
 * et un mode hors ligne degrade. Aucune donnee de reservation n'est mise en
 * cache, les creneaux doivent toujours venir du reseau.
 */
const CACHE = "delherren-v2";
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/media/logo-carbon.png",
  "/media/logo-paper.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/functions/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return response;
        }),
    ),
  );
});
