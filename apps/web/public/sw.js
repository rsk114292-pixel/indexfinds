/**
 * Site Service Worker
 * 策略：
 * - 静态资源 (/_next/static/*): Cache First（带 hash，天然可长缓存）
 * - 图标/字体: Cache First
 * - CDN 图片 (si.geilicdn.com): Stale While Revalidate
 * - 页面导航: Network First（失败时展示 offline 页面）
 * - API 请求 (/api/*): 不缓存（含认证逻辑，SW 不应干预）
 */

const CACHE_VERSION = 'fs-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// 预缓存的核心资源
const PRECACHE_URLS = [
  '/offline.html',
  '/icons/icon-192x192.png',
];

// ===== 安装阶段：预缓存核心资源 =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ===== 激活阶段：清理旧缓存 =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('fs-') && key !== STATIC_CACHE && key !== IMAGE_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== 请求拦截 =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过：非 GET 请求
  if (request.method !== 'GET') return;

  // 跳过：API 请求（含认证逻辑，不应缓存）
  if (url.pathname.startsWith('/api/')) return;

  // 跳过：Chrome 扩展等非 http(s) 请求
  if (!url.protocol.startsWith('http')) return;

  // 策略 1：Next.js 静态资源 → Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 策略 2：图标和字体 → Cache First
  if (url.pathname.startsWith('/icons/') || url.pathname.match(/\.(woff2?|ttf|otf)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 策略 3：CDN 商品图片 → Stale While Revalidate
  if (url.hostname === 'si.geilicdn.com') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // 策略 4：页面导航 → Network First（失败时 offline）
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }
});

// ===== 缓存策略实现 =====

/** Cache First: 优先缓存，缓存没有则网络请求并缓存 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

/** Stale While Revalidate: 返回缓存同时后台更新 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/** Network First + Offline Fallback: 网络优先，失败时展示离线页 */
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/offline.html');
  }
}
