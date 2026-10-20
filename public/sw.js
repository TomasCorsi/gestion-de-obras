// One-release replacement for the old app-shell worker at this exact URL.
function isAppCache(name) {
  const workboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  const legacyAppCache = ["html-cache", "supabase-api-cache", "assets-cache", "static-resources", "supabase-reference-data", "google-fonts-cache"].includes(name);
  return legacyAppCache || (workboxBucket && name.endsWith(self.registration.scope));
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.allSettled(names.filter(isAppCache).map((name) => caches.delete(name)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
    } finally {
      await self.registration.unregister();
    }
  })()),
);