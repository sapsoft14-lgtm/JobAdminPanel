// SAP Admin Control Center — minimal install-enabling service worker.
//
// This intentionally does NOT try to cache/replay the live admin data
// (jobs, invoices, notifications) — that all comes from the Supabase Edge
// Function and must always be fresh. The only job of this file is to
// satisfy the browser's PWA installability requirement (a registered
// service worker with a fetch handler), plus a tiny "app shell" cache so
// the page can still open (showing cached UI) if the network briefly drops.
const CACHE_NAME = "sap-admin-shell-v1";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything: always try to get live data/UI, and only
// fall back to the cached app shell if the network request fails (offline
// or the site is briefly unreachable). Never serves stale data instead of
// live data when the network is actually available.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
