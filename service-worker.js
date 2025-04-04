// Tên cache và các file cần lưu vào cache
const CACHE_NAME = 'typing-game-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/dictionary.json',
  '/favicon.ico'
];

// Sự kiện install - cài đặt Service Worker và cache các file
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mở cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Sự kiện activate - xóa cache cũ
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Sự kiện fetch - trả về từ cache nếu có, nếu không thì fetch từ network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - trả về response từ cache
        if (response) {
          return response;
        }
        
        // Clone request vì nó chỉ được dùng một lần
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Kiểm tra nếu response hợp lệ
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response vì body chỉ được dùng một lần
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});