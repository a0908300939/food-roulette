const CACHE_NAME = 'food-roulette-v1';
const STATIC_CACHE = 'food-roulette-static-v1';
const DYNAMIC_CACHE = 'food-roulette-dynamic-v1';

// 預快取的關鍵資源（應用外殼）
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// 安裝 Service Worker - 預快取關鍵資源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    Promise.all([
      // 快取靜態資源
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static app shell');
        return cache.addAll(urlsToCache);
      }),
      // 清理舊快取
      caches.delete(CACHE_NAME),
      caches.delete(DYNAMIC_CACHE),
    ])
  );
  // 強制等待中的 Service Worker 變為激活狀態
  self.skipWaiting();
});

// 激活 Service Worker - 清理舊快取
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 保留最新的快取版本
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 立即控制所有頁面
  return self.clients.claim();
});

// 攔截請求 - 實作快取優先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只快取 GET 請求
  if (request.method !== 'GET') {
    return;
  }

  // 跳過 API 請求（讓它們直接走網路，但會快取成功的回應）
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 對於靜態資源（CSS、JS、圖片等）使用快取優先策略
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // 對於 HTML 和其他資源使用網路優先策略
  event.respondWith(networkFirstStrategy(request));
});

/**
 * 快取優先策略：先查快取，如果沒有再從網路獲取
 * 適用於：CSS、JS、圖片等靜態資源
 */
function cacheFirstStrategy(request) {
  return caches.match(request).then((response) => {
    if (response) {
      console.log('[SW] Cache hit:', request.url);
      return response;
    }

    console.log('[SW] Cache miss, fetching from network:', request.url);
    return fetch(request).then((response) => {
      // 檢查是否是有效的回應
      if (!response || response.status !== 200) {
        return response;
      }

      // 複製回應並快取
      const responseToCache = response.clone();
      caches.open(DYNAMIC_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });

      return response;
    }).catch((error) => {
      console.log('[SW] Fetch failed, returning offline response:', error);
      // 如果網路失敗且快取中沒有，返回離線頁面
      return caches.match('/');
    });
  });
}

/**
 * 網路優先策略：先從網路獲取，失敗時使用快取
 * 適用於：HTML 頁面、API 回應
 */
function networkFirstStrategy(request) {
  return fetch(request)
    .then((response) => {
      // 檢查是否是有效的回應
      if (!response || response.status !== 200) {
        return response;
      }

      // 複製回應並快取（更新快取）
      const responseToCache = response.clone();
      caches.open(DYNAMIC_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });

      console.log('[SW] Network success, cached:', request.url);
      return response;
    })
    .catch((error) => {
      console.log('[SW] Network failed, trying cache:', request.url);
      // 網路失敗時，嘗試從快取獲取
      return caches.match(request).then((response) => {
        if (response) {
          console.log('[SW] Cache hit (fallback):', request.url);
          return response;
        }

        // 如果快取中也沒有，返回離線頁面
        console.log('[SW] No cache available, returning offline page');
        return caches.match('/');
      });
    });
}

/**
 * 處理 API 請求：網路優先，快取作為備份
 */
function handleApiRequest(request) {
  return fetch(request)
    .then((response) => {
      // 只快取成功的 API 回應
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch((error) => {
      console.log('[SW] API fetch failed, trying cache:', request.url);
      // API 失敗時，嘗試返回快取的回應
      return caches.match(request).then((response) => {
        if (response) {
          console.log('[SW] Returning cached API response:', request.url);
          return response;
        }
        // 無法提供離線 API 回應
        throw error;
      });
    });
}

/**
 * 判斷是否為靜態資源
 */
function isStaticAsset(url) {
  const staticExtensions = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];

  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}
