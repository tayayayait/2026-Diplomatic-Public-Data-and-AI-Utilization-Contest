const CACHE_NAME = 'saferoute-v1';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // 브라우저 확장 프로그램 등 http/https가 아닌 요청은 무시
  if (!event.request.url.startsWith('http')) return;
  // 외부 API 요청 (공공데이터 포털 등)은 Service Worker에서 처리하지 않음
  if (!event.request.url.startsWith(self.location.origin)) return;
  // API 경로나 POST 요청은 캐시하지 않음
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공한 응답만 캐시에 저장
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 (오프라인) 캐시 반환
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 캐시에도 없으면 503 반환하여 TypeError 방지
          return new Response("Offline and not cached", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" })
          });
        });
      })
  );
});
