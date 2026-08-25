/* Service worker — network-first, cache เป็นตัวสำรองตอนเน็ตหลุดเท่านั้น
   ตั้งใจไม่ใช้ cache-first เพราะเคยเจอปัญหาไฟล์ค้างเวอร์ชันเก่าหลัง deploy */
const C = 'cts-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* แตะแบนเนอร์แจ้งเตือน -> สลับไปที่แอปที่เปิดค้างอยู่ ถ้าไม่มีก็เปิดใหม่ */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;                              // POST ไป Apps Script ต้องไม่แตะ cache
  if (new URL(e.request.url).origin !== location.origin) return;       // ข้อมูลจาก Apps Script ให้ผ่านตรงไปเสมอ
  e.respondWith(
    fetch(e.request)
      .then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request))
  );
});
