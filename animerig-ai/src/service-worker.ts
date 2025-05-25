// PWA 서비스워커: 오프라인 캐싱 및 기본 상호작용 지원
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open('ai-character-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/models/expression-cache.json',
        '/models/gesture-library.json',
        '/assets/default-character.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (event: any) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
