const CACHE_NAME = 'madmen-hub-static-v232';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/css/app.css',
  '/css/mercenary-lobby.css',
  '/js/api.js',
  '/js/perfLogger.js',
  '/js/formatters.js',
  '/js/titleBadge.js',
  '/js/notificationBadge.js',
  '/js/main.js',
  '/js/mercenary-data-loader.js',
  '/js/mercenary-lobby.js',
  '/mercenary.html',
  '/data/mercenaries.master.json',
  '/icons/icon.svg',
  '/icons/maskable-icon.svg'
];

const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|webmanifest)$/i;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isSensitiveRequest(request, url) {
  if (request.method !== 'GET') return true;
  if (!isSameOrigin(url)) return true;
  if (request.headers.has('authorization')) return true;
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname === '/health') return true;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) return true;
  return false;
}

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match('/offline.html')) || Response.error();
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    fetchAndCache(request).catch(() => {});
    return cached;
  }
  return fetchAndCache(request);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isSensitiveRequest(request, url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  event.respondWith(fetch(request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
