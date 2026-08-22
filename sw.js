// ===== Service Worker: Forest Guard =====
const CACHE_NAME = 'forest-guard-v1';

// ไฟล์ "app shell" ที่อยากให้ใช้งานได้แม้ออฟไลน์
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ติดตั้ง: cache app shell ไว้ล่วงหน้า
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// เปิดใช้งาน: ลบ cache รุ่นเก่าทิ้ง
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ดักจับ request:
// - หน้า/ไฟล์ static ในเว็บนี้ -> cache-first (ใช้งานออฟไลน์ได้)
// - คำขอไปยัง Google Sheet API / โดเมนอื่น (ข้อมูลเซ็นเซอร์แบบเรียลไทม์)
//   -> network-first เสมอ เพื่อให้ได้ข้อมูลสดใหม่ที่สุด
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
        );
      })
    );
  } else {
    // ข้อมูลเซ็นเซอร์/สภาพอากาศต้องเป็นข้อมูลสด ไม่ควรใช้จาก cache
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
