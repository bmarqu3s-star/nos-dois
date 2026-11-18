/* Nós Dois — service worker. A versão do cache é carimbada pelo build (scripts/build.mjs). */
const VERSION = "nos-dois-__VERSION__";
const EXT = "nos-dois-externos";
const SHELL = ["./", "index.html", "manifest.webmanifest", "favicon.svg", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== EXT).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin && u.pathname.includes("/vendor/")) {
    // bibliotecas locais (leitor de PDF): ficam guardadas para abrir ingressos sem internet
    e.respondWith(caches.open(EXT).then(async c => { const hit = await c.match(r); if (hit) return hit; const x = await fetch(r); if (x && x.ok) c.put(r, x.clone()); return x; }));
    return;
  }
  if (u.origin === location.origin) {
    e.respondWith(
      caches.match(r).then(hit => hit || fetch(r).catch(() => (r.mode === "navigate" ? caches.match("index.html") : Response.error())))
    );
    return;
  }
  // fontes e bibliotecas: usa o que já tem e atualiza em segundo plano
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$|(^|\.)cdnjs\.cloudflare\.com$|^www\.gstatic\.com$/.test(u.host)) {
    e.respondWith(
      caches.open(EXT).then(async c => {
        const hit = await c.match(r);
        const net = fetch(r).then(x => { if (x && (x.ok || x.type === "opaque")) c.put(r, x.clone()); return x; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
