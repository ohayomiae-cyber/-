// Borders in Ink — 오프라인 캐시
// 같은 주소의 파일은 '네트워크 먼저'(업데이트가 바로 반영), CDN 라이브러리는 '캐시 먼저'(버전이 고정된 주소)
const V = 'bi-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (/googleapis\.com$/.test(u.host) && !/fonts\./.test(u.host)) return; // Firebase 실시간 연결은 그대로 통과
  const cdn = /(^|\.)cdnjs\.cloudflare\.com$|(^|\.)cdn\.jsdelivr\.net$|(^|\.)unpkg\.com$|^fonts\.(googleapis|gstatic)\.com$/.test(u.host);
  if (cdn) {
    e.respondWith(caches.open(V).then(async c => {
      const m = await c.match(r);
      if (m) return m;
      const res = await fetch(r);
      if (res.ok || res.type === 'opaque') c.put(r, res.clone());
      return res;
    }));
    return;
  }
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
  }
});
