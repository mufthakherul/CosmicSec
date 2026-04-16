/**
 * CosmicSec Service Worker — Phase U.1 (PWA)
 *
 * Strategy:
 *  - Static assets: Cache-first (install & cache on SW activation)
 *  - API requests: Network-first with offline fallback
 *  - Failed scan submissions: Background sync queue
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `cosmicsec-static-${CACHE_VERSION}`;
const API_CACHE = `cosmicsec-api-${CACHE_VERSION}`;
const OFFLINE_PAGE = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/og-image.svg",
  "/robots.txt",
];

const API_ROUTES_CACHE_30S = [
  "/api/dashboard/overview",
];

// ---------------------------------------------------------------------------
// Install — pre-cache static shell
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS)
    ).then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch — routing strategy
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin and API requests
  if (request.method !== "GET") return;

  // API requests — network-first, short cache on success
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 30));
    return;
  }

  // Static SPA assets — cache-first, fallback to index.html for routes
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithNetworkFallback(request));
  }
});

// ---------------------------------------------------------------------------
// Background sync — queue failed scan submissions
// ---------------------------------------------------------------------------
self.addEventListener("sync", (event) => {
  if (event.tag === "cosmicsec-scan-submit") {
    event.waitUntil(replayQueuedScans());
  }
});

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "CosmicSec", body: event.data.text() };
  }

  const options = {
    body: payload.body || "New security event",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: payload.tag || "cosmicsec-notification",
    data: payload.data || {},
    actions: payload.actions || [],
    requireInteraction: payload.severity === "critical",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "CosmicSec", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const existing = cs.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: "NAVIGATE", url });
      } else {
        clients.openWindow(url);
      }
    })
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function networkFirstWithCache(request, cacheName, ttlSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const clone = response.clone();
      const headers = new Headers(clone.headers);
      headers.append("sw-cached-at", Date.now().toString());
      // Store with metadata
      cache.put(request, new Response(await clone.blob(), {
        status: clone.status,
        statusText: clone.statusText,
        headers,
      }));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Offline — cached data unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheFirstWithNetworkFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // SPA fallback — serve index.html for any unmatched route
    const indexCache = await caches.match("/index.html");
    if (indexCache) return indexCache;
    return new Response("Offline", { status: 503 });
  }
}

async function replayQueuedScans() {
  // Read queued scan submissions from IndexedDB and retry
  try {
    const db = await openIDB();
    const tx = db.transaction("scan_queue", "readwrite");
    const store = tx.objectStore("scan_queue");
    const requests = await idbGetAll(store);

    for (const item of requests) {
      try {
        const resp = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        if (resp.ok) {
          await idbDelete(store, item.id);
          notifyClients({ type: "SCAN_QUEUED_SENT", id: item.id });
        }
      } catch {
        // Keep in queue for next sync attempt
      }
    }
  } catch {
    // IDB not available
  }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("cosmicsec-sw", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("scan_queue")) {
        db.createObjectStore("scan_queue", { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = reject;
  });
}

function idbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = resolve;
    req.onerror = reject;
  });
}

function notifyClients(message) {
  clients.matchAll({ type: "window" }).then((cs) => {
    cs.forEach((c) => c.postMessage(message));
  });
}
