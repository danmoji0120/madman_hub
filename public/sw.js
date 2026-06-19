const CACHE_NAME = 'madmen-hub-static-v304';
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
  '/js/mercenary-audio.js',
  '/js/mercenary-combat-contract.js',
  '/js/mercenary-combat-adapters.js',
  '/js/mercenary-lobby.js',
  '/mercenary.html',
  '/data/mercenaries.master.json',
  '/data/mercenary.attack-types.json',
  '/data/mercenary.skills.json',
  '/data/mercenary.status-effects.json',
  '/data/mercenary.combat-missions.master.json',
  '/data/mercenary.enemy-templates.master.json',
  '/data/mercenary.encounters.master.json',
  '/data/mercenary.encounter-enemies.master.json',
  '/data/mercenary.combat-rewards.master.json',
  '/data/mercenary.combat-rules.master.json',
  '/data/mercenary.combat-logs.master.json',
  '/data/mercenary.items.master.json',
  '/data/mercenary.equipment.master.json',
  '/data/mercenary.equipment-image-prompts.master.json',
  '/icons/icon.svg',
  '/icons/maskable-icon.svg'
];

const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|webmanifest)$/i;
const AUDIO_ASSET_PATTERN = /\.(?:mp3|ogg|wav|m4a|flac)$/i;

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

function isRangeRequest(request) {
  return request.headers.has('range');
}

function isAudioAsset(url) {
  return AUDIO_ASSET_PATTERN.test(url.pathname);
}

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response && response.status === 200 && response.type === 'basic') {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    } catch (cacheError) {
      console.warn('[sw] cache put skipped:', request.url, cacheError);
    }
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

  if (isRangeRequest(request) || isAudioAsset(url)) {
    event.respondWith(fetch(request));
    return;
  }

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
