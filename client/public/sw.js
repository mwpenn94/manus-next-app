/**
 * Service Worker — Manus Next PWA
 *
 * Strategies:
 *   - App shell (HTML, offline page): network-first with offline fallback
 *   - Hashed static assets (.js, .css with content hash): cache-first (immutable)
 *   - Fonts (Google Fonts): stale-while-revalidate
 *   - API routes (/api/*): network-only (never cached)
 *   - Everything else: network-first with cache fallback
 *
 * Version bump: change CACHE_VERSION to bust all caches on deploy.
 */

const CACHE_VERSION = 2;
const CACHE_NAME = `manus-next-v${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

/**
 * Precache list — minimal shell for instant offline fallback.
 * Vite-hashed assets are cached on first fetch (cache-first).
 */
const PRECACHE_URLS = [
  '/',
  '/offline.html',
];

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('manus-next-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Helpers ──────────────────────────────────────────────

/** Returns true if the URL points to a Vite-hashed static asset */
function isHashedAsset(url) {
  // Vite outputs: /assets/index-abc123.js, /assets/style-def456.css
  return /\/assets\/[^/]+-[a-zA-Z0-9]{8,}\.(js|css|woff2?|ttf|eot|png|jpg|svg|gif|ico|webp)(\?.*)?$/.test(url.pathname);
}

/** Returns true if the URL is a Google Fonts resource */
function isGoogleFont(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

/** Returns true if the URL is an API or streaming endpoint */
function isApiRoute(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/manus-storage/');
}

// ── Fetch ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip API routes entirely — always go to network
  if (isApiRoute(url)) return;

  // Skip SSE / WebSocket upgrades
  if (request.headers.get('accept')?.includes('text/event-stream')) return;

  // ── Hashed static assets: cache-first (immutable) ──
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Google Fonts: stale-while-revalidate ──
  if (isGoogleFont(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── Navigation requests: network-first with offline fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match(OFFLINE_URL)
          )
        )
    );
    return;
  }

  // ── Default: network-first with cache fallback ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── Message handler for skip-waiting from client ─────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
