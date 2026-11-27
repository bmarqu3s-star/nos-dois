"use strict";
/* ---------- aparelho: detecta iPhone/Android/PWA e ajusta a altura do app ---------- */
const DEV = (() => {
  const ua = navigator.userAgent || "", ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua), sa = (navigator.standalone === true) || matchMedia("(display-mode: standalone)").matches;
  return { ios, android, sa, os: ios ? "ios" : android ? "android" : "desktop" };
})();
function fitApp() {
  const de = document.documentElement, iw = innerWidth, ih = (window.visualViewport && visualViewport.height) || innerHeight;
  const portrait = ih > iw; let h = 0;
  /* iPhone instalado na tela de início às vezes abre com a janela menor que a tela (barra deslocada): usa a altura real da tela */
  if (DEV.ios && DEV.sa && portrait) { const sh = Math.max(screen.width, screen.height); if (sh > ih + 8 && sh < ih + 140) h = sh; }
  de.dataset.os = DEV.os; de.dataset.pwa = DEV.sa ? "1" : "0";
  if (h) de.style.setProperty("--appH", h + "px"); else de.style.removeProperty("--appH");
  DEV.info = `${DEV.os}${DEV.sa ? " · app instalado" : " · navegador"} · janela ${iw}×${Math.round(ih)} · tela ${screen.width}×${screen.height} · altura usada ${h || "automática"}`;
  const e = document.getElementById("devInfo"); if (e) e.textContent = DEV.info;
}
fitApp(); ["resize", "orientationchange", "pageshow"].forEach(ev => addEventListener(ev, () => setTimeout(fitApp, 60)));
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(fitApp, 60); else flushSave(); });
addEventListener("pagehide", () => flushSave());
if (window.visualViewport) visualViewport.addEventListener("resize", () => fitApp());

/* ---------- utilidades de DOM / ícones ---------- */
const $ = s => document.querySelector(s);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function debounce(fn, ms = 150) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const IC = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  fork: '<path d="M6 3v6a3 3 0 0 0 3 3v9M12 3v6a3 3 0 0 1-3 3M9 3v18M19 21V3c-2.5 1.5-3.5 4-3.5 7.5H19"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sliders: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  mark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  ticket: '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4M5 13v7h14v-7"/>',
  map: '<path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.3"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>',
  spark: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'
};
const ico = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

/* ---------- tema (Caldeirão) ---------- */
const F = { MAN: "Manrope:wght@400;500;700", BRI: "Bricolage+Grotesque:wght@500;800" };
const DEF = {
  chrome: "var(--surface)", chromeInk: "var(--ink)", chromeMuted: "var(--muted)", chromeLine: "var(--line)", chromeAct: "var(--surface2)",
  hiBg: "var(--surface)", hiInk: "var(--ink)", hiB: "1px solid var(--line)", hiSh: "none", pr: "var(--r)",
  cardsh: "none", tt: "none", ti: "italic", track: "-.01em", tw: "600"
};
const THEMES = [
  { id: "caldeirao", n: "10", name: "Caldeirão", tag: "Adesivos, bordas grossas, a bruxa que ri", dark: false, badge: "sticker",
    gf: [F.BRI, F.MAN], serif: "'Bricolage Grotesque', system-ui, sans-serif", sans: "'Manrope', system-ui, sans-serif",
    wm: "Nós Dois", wmcss: "font-weight:800;letter-spacing:-.03em;text-shadow:2px 2px 0 #1E5A38",
    gr: [["#6E1B33", "#2E7D4F"], ["#2E7D4F", "#1E5A38"], ["#C9507A", "#6E1B33"], ["#3F9A64", "#1E5A38"]],
    v: { bg: "#FBF3DC", surface: "#FFF9E8", surface2: "#F0E4C4", ink: "#2A0F18", muted: "#6A4A52", line: "#E0CFA0", film: "#6E1B33", onFilm: "#FBF3DC", filmT: "#6E1B33", food: "#2E7D4F", onFood: "#FBF3DC", foodT: "#1F6A3E", gold: "#B9E3A0", onGold: "#2A0F18", goldT: "#1F6A3E", danger: "#B3261E", chrome: "#2E7D4F", chromeInk: "#FBF3DC", chromeMuted: "#C6E6CC", chromeLine: "#1E5A38", chromeAct: "#1E5A38", r: "14px", rb: "12px", rc: "999px", ri: "12px", cardb: "2px solid #6E1B33", cardsh: "4px 4px 0 #6E1B33", hiB: "2px solid #6E1B33", hiSh: "4px 4px 0 #6E1B33", emc: "#6E1B33", navOn: "#FBF3DC", bdgBg: "#FBF3DC", bdgInk: "#6E1B33", tw: "800", ti: "normal", track: "-.03em" } }
];
const CUR = THEMES[0];

let SID = 0;
const SYM = {
  caldeirao: () => { const i = "c" + (++SID); return { w: 220, h: 140, b: `<defs><clipPath id="${i}"><circle cx="82" cy="70" r="52"/></clipPath></defs><circle cx="90" cy="78" r="52" fill="#143F27"/><circle cx="148" cy="78" r="52" fill="#143F27"/><circle cx="82" cy="70" r="52" fill="#FBF3DC" stroke="#6E1B33" stroke-width="5"/><circle cx="140" cy="70" r="52" fill="#6E1B33" stroke="#6E1B33" stroke-width="5"/><circle cx="140" cy="70" r="52" fill="#B9E3A0" stroke="#6E1B33" stroke-width="5" clip-path="url(#${i})"/>` }; }
};
function symbol(id, h) {
  const s = (SYM[id] || SYM.caldeirao)(), w = Math.round(h * s.w / s.h);
  return `<svg width="${w}" height="${h}" viewBox="${s.x || 0} ${s.y || 0} ${s.w} ${s.h}" role="img" aria-label="Símbolo Nós Dois">${s.b}</svg>`;
}
const brandHTML = (t, h) => `<span class="bsym">${symbol(t.id, h)}</span><span class="bwm" style="${t.wmcss}">${t.wm}</span>`;

function wantBtn(i) {
  const on = isWant(i);
  return `<button type="button" class="wantbtn ${on ? "on" : ""}" data-act="want" data-id="${i.id}" aria-pressed="${on}" aria-label="${on ? "Tirar de Queremos ver" : "Salvar em Queremos ver"}" title="${on ? "Em Queremos ver (toque para tirar)" : "Salvar em Queremos ver"}">${ico("mark", 18)}</button>`;
}
function badgeHTML(i) {
  if (i.status !== "visto") return i.kind === "filme" ? wantBtn(i) : `<span class="badge wish">${ico("mark", 16)}</span>`;
  if (i.rating == null) return `<span class="badge none" title="Falta avaliar">?</span>`;
  return `<span class="badge b-sticker"><span>${fmt(i.rating)}</span></span>`;
}

const gfURL = l => "https://fonts.googleapis.com/css2?" + [...new Set(l)].map(f => "family=" + f).join("&") + "&display=swap";
function loadFonts(key, list) {
  if (document.getElementById("gf-" + key)) return;
  const l = document.createElement("link"); l.id = "gf-" + key; l.rel = "stylesheet"; l.href = gfURL(list); document.head.appendChild(l);
}
function applyTheme() {
  const t = CUR, r = document.documentElement, v = { ...DEF, ...t.v, serif: t.serif, sans: t.sans };
  Object.keys(v).forEach(k => r.style.setProperty("--" + k, v[k]));
  r.style.colorScheme = "light";
  r.style.setProperty("--showT", "#8A5A00"); r.style.setProperty("--onShow", "#FFF7E0");
  const tc = $("#tc"); if (tc) tc.setAttribute("content", t.v.chrome || t.v.bg);
  loadFonts(t.id, t.gf);
  S.theme = t.id;
  renderShell(); render();
}

/* ---------- estado e armazenamento (Blob no IndexedDB + cache LRU de ObjectURL) ---------- */
let S = { v: 1, names: ["Eu", "Ela"], items: [], theme: "caldeirao", catalogV: 0 };
let TMDBKEY = "";
let CATALOG_COUNT = 161;
let db = null, storageOk = false;
let ui = {
  cat: "", tmdb: "", im: "", imf: { g: "", l: "", a: "2010", b: "2026", v: "200", m: "", n: "300", s: "popularity.desc", st: "", p: "1" },
  sec: "home", rk: { by: "exp", cu: "", n: 10 }, sg: { q: "", cu: "", oh: "now", vis: "", pr: "", sort: "rating", n: 12 },
  ag: { view: "lista", m: "", d: "" },
  filmes: { st: "visto", q: "", sort: "recent", n: 60, g: "", dir: "", cast: "" },
  rest: { st: "visto", q: "", sort: "recent", n: 60, bairro: "", cuis: "", sec: "lista" },
  map: { st: "all", near: false, radius: 5, user: null },
  shows: { st: "visto", q: "", sort: "recent", n: 60, t: "", y: "", art: "" },
  imp: "", pst: "", osm: "", osmImg: "", osf: { rest: "1", cafe: "1", fast: "1", bar: "1", sorv: "1", praca: "1" }
};

const IMG_KEYS = new Set();
const ATT_KEYS = new Set();
const MEDIA_LRU = new Map();
const MEDIA_MAX = 80;
const MEDIA_INFLIGHT = new Map();

function mediaCacheGet(k) {
  if (!MEDIA_LRU.has(k)) return "";
  const url = MEDIA_LRU.get(k);
  MEDIA_LRU.delete(k);
  MEDIA_LRU.set(k, url);
  return url;
}
function mediaCacheSet(k, blob) {
  if (MEDIA_LRU.has(k)) {
    const old = MEDIA_LRU.get(k);
    if (old && old.startsWith("blob:")) try { URL.revokeObjectURL(old); } catch (e) { }
    MEDIA_LRU.delete(k);
  }
  const url = typeof blob === "string" ? blob : URL.createObjectURL(blob);
  MEDIA_LRU.set(k, url);
  while (MEDIA_LRU.size > MEDIA_MAX) {
    const first = MEDIA_LRU.keys().next().value;
    const u = MEDIA_LRU.get(first);
    MEDIA_LRU.delete(first);
    if (u && u.startsWith("blob:")) try { URL.revokeObjectURL(u); } catch (e) { }
  }
  return url;
}
function mediaCacheDel(k) {
  if (!MEDIA_LRU.has(k)) return;
  const u = MEDIA_LRU.get(k);
  MEDIA_LRU.delete(k);
  if (u && u.startsWith("blob:")) try { URL.revokeObjectURL(u); } catch (e) { }
}
function mediaCacheClear() {
  for (const u of MEDIA_LRU.values()) if (u && u.startsWith("blob:")) try { URL.revokeObjectURL(u); } catch (e) { }
  MEDIA_LRU.clear();
}

function readFileDataURL(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
const blobToDataUrl = blob => typeof blob === "string" ? Promise.resolve(blob) : readFileDataURL(blob);
function dataUrlToBlob(dataUrl) {
  if (dataUrl instanceof Blob) return dataUrl;
  const parts = String(dataUrl || "").split(","), meta = parts[0] || "", b64 = parts[1] || "";
  const mime = (meta.match(/:([^;]+);/) || [])[1] || "application/octet-stream";
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

let _webpOk = null;
function canvasToBlob(canvas, q = 0.76) {
  return new Promise(res => {
    const fallback = () => canvas.toBlob(b => res(b || dataUrlToBlob(canvas.toDataURL("image/jpeg", q))), "image/jpeg", q);
    if (_webpOk === false) return fallback();
    canvas.toBlob(b => {
      if (b && b.type === "image/webp") { _webpOk = true; res(b); }
      else { _webpOk = false; fallback(); }
    }, "image/webp", q);
  });
}

async function resizeImage(file, max = 700, q = 0.76) {
  const url = file instanceof Blob ? URL.createObjectURL(file) : String(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const sc = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * sc));
    c.height = Math.max(1, Math.round(img.naturalHeight * sc));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await canvasToBlob(c, q);
  } finally {
    if (file instanceof Blob) try { URL.revokeObjectURL(url); } catch (e) { }
  }
}

const req2p = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
function openDB() {
  return new Promise(res => {
    try {
      const r = indexedDB.open("nos-dois", 1);
      r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("img"); };
      r.onsuccess = () => { db = r.result; storageOk = true; res(true); };
      r.onerror = r.onblocked = () => res(false);
    } catch (e) { res(false); }
  });
}
async function dbWrite(store, fn) {
  if (!db) return;
  try {
    const t = db.transaction(store, "readwrite");
    fn(t.objectStore(store));
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error); });
  } catch (e) { storageOk = false; }
}
async function dbGet(store, key) {
  if (!db) return undefined;
  try { return await req2p(db.transaction(store).objectStore(store).get(key)); } catch (e) { return undefined; }
}

const hasImg = id => IMG_KEYS.has(id);
const hasAtt = id => ATT_KEYS.has(id);

async function getImgBlob(id) {
  const v = await dbGet("img", id);
  if (!v) return null;
  return v instanceof Blob ? v : dataUrlToBlob(v);
}
async function getImgDataUrl(id) {
  const v = await dbGet("img", id);
  if (!v) return null;
  return typeof v === "string" ? v : blobToDataUrl(v);
}
async function getImgUrlAsync(id) {
  const hit = mediaCacheGet(id);
  if (hit) return hit;
  if (!IMG_KEYS.has(id)) return "";
  if (MEDIA_INFLIGHT.has(id)) return MEDIA_INFLIGHT.get(id);
  const p = (async () => {
    const blob = await getImgBlob(id);
    if (!blob) { IMG_KEYS.delete(id); return ""; }
    return mediaCacheSet(id, blob);
  })().finally(() => MEDIA_INFLIGHT.delete(id));
  MEDIA_INFLIGHT.set(id, p);
  return p;
}
function getImgUrl(id) {
  if (!IMG_KEYS.has(id)) return "";
  const hit = mediaCacheGet(id);
  if (hit) return hit;
  getImgUrlAsync(id).then(url => {
    if (!url) return;
    document.querySelectorAll(`img[data-img-id="${CSS.escape(id)}"]`).forEach(el => { el.src = url; el.removeAttribute("data-img-id"); });
  });
  return "";
}
function imgTag(id, cls = "poster", alt = "") {
  const url = getImgUrl(id);
  const srcAttr = url ? `src="${url}"` : `data-img-id="${esc(id)}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"`;
  return `<img class="${cls}" ${srcAttr} alt="${esc(alt)}" loading="lazy" decoding="async">`;
}

function setImg(id, d, skipSync) {
  const blob = d instanceof Blob ? d : dataUrlToBlob(d);
  IMG_KEYS.add(id);
  mediaCacheSet(id, blob);
  dbWrite("img", s => s.put(blob, id));
  if (!skipSync) { markImgDirty(id); syncSoon(); }
}
function delImg(id, skipSync) {
  IMG_KEYS.delete(id);
  mediaCacheDel(id);
  dbWrite("img", s => s.delete(id));
  if (!skipSync) { markImgDirty(id); syncSoon(); }
}

async function getAttBlob(id) {
  const v = await dbGet("img", "a:" + id);
  if (!v) return null;
  return v instanceof Blob ? v : dataUrlToBlob(v);
}
async function getAttDataUrl(id) {
  const v = await dbGet("img", "a:" + id);
  if (!v) return null;
  return typeof v === "string" ? v : blobToDataUrl(v);
}
function attSave(id, d) {
  const blob = d instanceof Blob ? d : dataUrlToBlob(d);
  ATT_KEYS.add(id);
  mediaCacheDel("a:" + id);
  dbWrite("img", st => st.put(blob, "a:" + id));
}
function delAttLocal(id) {
  ATT_KEYS.delete(id);
  mediaCacheDel("a:" + id);
  dbWrite("img", st => st.delete("a:" + id));
}

function markDirty(id) {
  if (typeof SY === "undefined" || !SY) return;
  if (Array.isArray(id)) id.forEach(x => { if (x) SY.dirty.add(x); });
  else if (id) SY.dirty.add(id);
}
function markImgDirty(id) {
  if (typeof SY === "undefined" || !SY) return;
  if (id) SY.dirtyImgs.add(id);
}

let saveTimer = null, savePending = false;
function flushSave() {
  if (!savePending) return;
  clearTimeout(saveTimer); savePending = false;
  dbWrite("kv", s => s.put(JSON.parse(JSON.stringify(S)), "state"));
}
function save(dirtyId) {
  if (dirtyId) markDirty(dirtyId);
  savePending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 250);
  syncSoon();
}

async function loadAll() {
  if (!(await openDB())) return;
  try {
    const st = await req2p(db.transaction("kv").objectStore("kv").get("state"));
    if (st && Array.isArray(st.items)) S = { v: 1, names: st.names || ["Eu", "Ela"], items: st.items, theme: "caldeirao", catalogV: st.catalogV || 0, lastImp: st.lastImp || "", lastOsm: st.lastOsm || "" };
    S.items.forEach(coupleSync);
    S.items.forEach(i => { if (i.kind === "filme" && i.status === "quero" && i.want === undefined) i.want = !((i.src === "catalogo" || i.imp) && !i.edited && !i.date); });
    TMDBKEY = (await req2p(db.transaction("kv").objectStore("kv").get("tmdbKey"))) || "";
    /* Carrega somente as chaves das imagens e anexos (zero Base64 em RAM no boot) */
    const keys = await req2p(db.transaction("img").objectStore("img").getAllKeys());
    IMG_KEYS.clear(); ATT_KEYS.clear();
    keys.forEach(k => { if (typeof k === "string" && k.startsWith("a:")) ATT_KEYS.add(k.slice(2)); else IMG_KEYS.add(k); });
  } catch (e) { storageOk = false; }
  attGC();
}

/* ---------- catálogo desacoplado (carregado sob demanda de catalog.json) ---------- */
let _catCache = null;
async function fetchCatalog() {
  if (_catCache) return _catCache;
  const r = await fetch("catalog.json");
  if (!r.ok) throw new Error("Não consegui carregar catalog.json (" + r.status + ")");
  _catCache = await r.json();
  CATALOG_COUNT = _catCache.length;
  return _catCache;
}
async function loadCatalog() {
  const list = await fetchCatalog();
  const idx = new Map();
  S.items.filter(i => i.kind === "filme").forEach(i => { idx.set(keyOf(i.title, i.year), i); if (i.orig) idx.set(keyOf(i.orig, i.year), i); });
  let created = 0, enriched = 0;
  list.forEach(([dec, rank, orig, year, pt, dir, gen]) => {
    const y = String(year); let it = idx.get(keyOf(orig, y)) || (pt && idx.get(keyOf(pt, y)));
    if (!it) { it = newItem("filme", { title: pt || orig, orig, year: y, status: "quero", src: "catalogo", director: dir, genre: gen, lbRank: rank, lbDecade: dec }); S.items.push(it); idx.set(keyOf(orig, y), it); created++; }
    else { let ch = false; if (!it.director && dir) { it.director = dir; ch = true; } if (!it.genre && gen) { it.genre = gen; ch = true; } if (!it.orig) { it.orig = orig; ch = true; } if (!it.lbRank) { it.lbRank = rank; it.lbDecade = dec; ch = true; } if (ch) { markDirty(it.id); enriched++; } }
  });
  S.catalogV = 1; save();
  return { created, enriched, total: list.length };
}

function newItem(kind, p = {}) {
  return Object.assign({
    id: uid(), kind, title: "", year: "", status: "visto", date: "", where: "",
    rating: null, ra: null, rb: null, lbRating: null, lbUri: "", notes: "", tags: [],
    cuisine: "", price: "", dishes: "", director: "", genre: "", orig: "", lbRank: null, lbDecade: "", tmdbId: null, src: "manual", edited: false, created: Date.now()
  }, p);
}

/* ---------- UI helpers & acessibilidade ---------- */
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const prevFocus = new WeakMap();
function saveFocus(ov) {
  if (!ov) return;
  const a = document.activeElement;
  if (a && a !== document.body && !ov.contains(a)) prevFocus.set(ov, a);
}
function restoreFocus(ov) {
  const f = prevFocus.get(ov);
  prevFocus.delete(ov);
  if (f && f.isConnected && typeof f.focus === "function") f.focus();
}
function trapTab(e, ov) {
  if (e.key !== "Tab" || !ov || ov.hidden) return;
  const els = [...ov.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!els.length) { e.preventDefault(); return; }
  const first = els[0], last = els[els.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first || !ov.contains(document.activeElement)) { e.preventDefault(); last.focus(); }
  } else if (document.activeElement === last || !ov.contains(document.activeElement)) {
    e.preventDefault(); first.focus();
  }
}
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }
function askConfirm(msg, ok = "Confirmar") {
  return new Promise(res => {
    const d = $("#dlg");
    saveFocus(d);
    d.innerHTML = `<div class="sheet" style="max-width:420px"><h2 style="margin-bottom:10px">Tem certeza?</h2><p class="muted">${esc(msg)}</p><div class="acts"><span class="grow"></span><button class="btn" data-d="0">Cancelar</button><button class="btn" style="background:var(--danger);border-color:var(--danger);color:var(--bg)" data-d="1">${esc(ok)}</button></div></div>`;
    d.hidden = false;
    setTimeout(() => d.querySelector('[data-d="0"]')?.focus(), 20);
    d.onclick = e => { const b = e.target.closest("[data-d]"); if (b || e.target === d) { d.hidden = true; d.onclick = null; restoreFocus(d); res(b && b.dataset.d === "1"); } };
  });
}
