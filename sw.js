/* Service worker — network-first, cache เป็นตัวสำรองตอนเน็ตหลุดเท่านั้น
   ตั้งใจไม่ใช้ cache-first เพราะเคยเจอปัญหาไฟล์ค้างเวอร์ชันเก่าหลัง deploy */
const C = 'cts-v3';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;                              // POST ไป Apps Script ต้องไม่แตะ cache
  if (new URL(e.request.url).origin !== location.origin) return;       // ข้อมูลจาก Apps Script ให้ผ่านตรงไปเสมอ
  e.respondWith(
    fetch(e.request)
      .then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request))
  );
});

// แจ้งเตือนบนมือถือ (จาก Edge Function "push"): { title, body, nav } · nav = รหัสคำขอ
self.addEventListener('push', e => {
  const m = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(m.title || 'CTS Training', { body: m.body || '', icon: './icon-192.png', badge: './icon-192.png', data: { nav: m.nav || '' } }));
});
// แตะแจ้งเตือน -> แอปเปิดอยู่: ส่ง nav ให้แอปเปิดคำขอนั้น · ไม่เปิด: เปิดแอปพร้อม #r=<id>
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const nav = e.notification.data.nav;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs[0]) { cs[0].postMessage({ nav }); return cs[0].focus(); }
    return clients.openWindow(new URL('./' + (nav ? '#r=' + encodeURIComponent(nav) : ''), self.registration.scope).href);
  }));
});
