/* SW v7 — force refresh after FINAL_ONE build */
const CACHE='lbos-3-2-9-v7';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./versions/3.2.9/modules/master-closer-toolkit/index.html'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',e=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
