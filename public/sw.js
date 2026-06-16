function isAppCacheForThisRegistration(name) {
  const isWorkboxCache = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  const isNamedAppCache = [
    "static-assets-cache",
    "supabase-reference-data",
    "google-fonts-cache",
    "workbox-precache",
  ].some((prefix) => name.includes(prefix));
  return isWorkboxCache || isNamedAppCache;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCacheNames = cacheNames.filter(isAppCacheForThisRegistration);
        await Promise.allSettled(appCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);