/* ---------- restaurantes: cadastro (lugar) + experiências ---------- */
const CUISINE_GROUPS = [
  ["Cozinhas", ["Brasileira", "Mineira / Regional", "Self-service / Buffet", "Churrascaria", "Italiana", "Pizzaria", "Japonesa", "Chinesa", "Coreana", "Tailandesa", "Indiana", "Árabe", "Mexicana", "Peruana", "Argentina", "Francesa", "Portuguesa", "Espanhola", "Alemã", "Hambúrguer", "Lanches", "Frango", "Frutos do mar", "Vegetariana", "Contemporânea", "Internacional"]],
  ["Café e doces", ["Café / Padaria", "Sobremesas", "Sorveteria", "Confeitaria"]],
  ["Bebidas e coquetelaria", ["Coquetelaria / Drinks", "Speakeasy", "Bar", "Bar de vinhos", "Cervejaria / Pub"]]
];
const WANT = [["Sushi", /japon|sushi|temaki|yakisoba/], ["Pizza", /pizz/], ["Hambúrguer", /hamb|burger/], ["Massa", /ital|massa|pizz/], ["Churrasco", /churr|carne|grill|barbec|steak/], ["Brasileira", /brasil|mineir|regional|buffet|self/], ["Árabe", /arab/], ["Café e doces", /caf|padar|doce|sobrem|sorvet|confeit/], ["Drinks", /\bbar\b|coquet|drink|pub|cervej|speak|vinho/], ["Vegetariana", /veg/], ["Frutos do mar", /frutos|peixe|marisc/]];
const plKey = i => i.osm ? "o" + i.osm.id : "t" + norm(i.title) + "|" + norm(i.where || "");
function places() {
  const m = new Map();
  for (const i of S.items) { if (i.kind !== "rest") continue; const k = plKey(i); let p = m.get(k); if (!p) m.set(k, p = { key: k, items: [] }); p.items.push(i); }
  for (const p of m.values()) {
    const by = [...p.items].sort((a, b) => (b.edited ? 1 : 0) - (a.edited ? 1 : 0) || (b.date || "").localeCompare(a.date || "")), pick = f => { const x = by.find(i => i[f]); return x ? x[f] : ""; };
    p.title = by[0].title; p.cuisine = pick("cuisine"); p.price = pick("price"); p.where = pick("where"); p.hr = pick("hr"); p.dishes = pick("dishes");
    p.osm = (p.items.find(i => i.osm) || {}).osm || null; p.photoId = (p.items.find(i => hasImg(i.id)) || {}).id || null;
    p.visits = p.items.filter(i => i.status === "visto"); p.rated = p.visits.filter(i => i.rating != null);
    p.avg = p.rated.length ? avg(p.rated.map(i => i.rating)) : null; p.last = p.visits.map(i => i.date || "").sort().pop() || "";
    p.hours = p.hr || (p.osm && p.osm.hr) || ""; p.open = (p.visits.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0] || by[0]);
  }
  return m;
}
let _plMemo = null;
const plCounts = () => _plMemo || (_plMemo = (() => { const c = new Map(); for (const i of S.items) if (i.kind === "rest" && i.status === "visto") { const k = plKey(i); c.set(k, (c.get(k) || 0) + 1); } return c; })());
function ohPill(p) {
  const o = ohState(p.hours); if (!o.known) return `<span class="pill na">horário não informado</span>`;
  return o.open ? `<span class="pill ok">aberto · até ${o.until}</span>` : `<span class="pill no">fechado${o.opens ? " · abre " + o.opens : ""}</span>`;
}
const wantRe = q => { const n = norm(q); if (!n) return null; const w = WANT.find(x => norm(x[0]) === n || norm(x[0]).startsWith(n)); return w ? w[1] : null; };
function cuisineSel(cur) {
  const known = new Set(CUISINE_GROUPS.flatMap(g => g[1])), extra = cur && !known.has(cur) ? `<option selected>${esc(cur)}</option>` : "";
  return `<select id="f_cuisine"><option value="">—</option>${extra}${CUISINE_GROUPS.map(g => `<optgroup label="${g[0]}">${g[1].map(c => `<option ${cur === c ? "selected" : ""}>${c}</option>`).join("")}</optgroup>`).join("")}</select>`;
}
function cuisineOpts(cur, all) {
  const set = new Set(); for (const i of S.items) if (i.kind === "rest" && i.cuisine && (all || i.status === "visto")) set.add(i.cuisine);
  return `<option value="">Todas as cozinhas</option>${[...set].sort((a, b) => a.localeCompare(b, "pt-BR")).map(c => `<option ${cur === c ? "selected" : ""}>${esc(c)}</option>`).join("")}`;
}
async function fillFromPlace(it, p) {
  it.title = p.title; it.cuisine = p.cuisine; it.price = p.price; it.where = p.where; it.hr = p.hr || ""; if (p.osm) it.osm = { ...p.osm };
  if (p.photoId && !ED.preview) {
    const b = await getImgBlob(p.photoId);
    if (b && ED && ED.it === it) { ED.photo = b; ED.preview = URL.createObjectURL(b); ED._rev = true; }
  }
  ED.filled = `Restaurante já cadastrado: dados preenchidos${p.visits.length ? ` (${p.visits.length} ${p.visits.length === 1 ? "visita" : "visitas"}${p.avg != null ? ", nota média " + fmt(Math.round(p.avg * 10) / 10) : ""})` : ""}. Conte como foi desta vez.`;
}
async function placeAutofill() {
  if (!ED || ED.it.kind !== "rest" || !ED.isNew) return;
  const v = norm($("#f_title") && $("#f_title").value); if (!v) return;
  const c = [...places().values()].filter(p => norm(p.title) === v).sort((a, b) => b.visits.length - a.visits.length); if (!c.length) return;
  const p = c[0], pend = p.items.find(i => i.status === "quero");
  if (!p.visits.length && pend) { openEditor(pend.id, "rest", { status: "visto" }); toast("Restaurante já cadastrado: registre a visita"); return; }
  readForm(); const it = ED.it; await fillFromPlace(it, p); if (it.status === "visto" && !it.date) it.date = todayStr(); drawEditor();
}
async function newVisit(key) {
  const p = places().get(key); if (!p) return;
  openEditor(null, "rest", { status: "visto", date: todayStr(), title: p.title });
  await fillFromPlace(ED.it, p);
  drawEditor();
}

/* ---------- importar restaurantes de Curitiba (OpenStreetMap) ---------- */
const OSM_MIRRORS = ["https://overpass-api.de", "https://overpass.private.coffee", "https://overpass.kumi.systems", "https://maps.mail.ru/osm/tools/overpass"];
const OSM_BBOX = [-25.6436, -49.3892, -25.3450, -49.1843]; /* sul, oeste, norte, leste */
const OSM_TYPES = { rest: ["restaurant", "Restaurantes"], cafe: ["cafe", "Cafés e padarias"], fast: ["fast_food", "Fast-food e lanchonetes"], bar: ["bar|pub|biergarten", "Bares e pubs"], sorv: ["ice_cream", "Sorveterias"], praca: ["food_court", "Praças de alimentação"] };
const osmOut = h => { ui.osm = h; const e = $("#osmOut"); if (e) { e.hidden = false; e.innerHTML = h; } };
let osmBusy = false, osmStop = false;

/* ---------- buscar um restaurante pelo nome no OpenStreetMap (cadastro e Ajustes) ---------- */
const OSM_AMEN = "restaurant|cafe|bar|pub|fast_food|ice_cream|food_court|biergarten";
let OSMF = null;
const osmRx = n => { const m = { a: "aáàâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç" }; return norm(n).split(" ").filter(Boolean).map(w => w.split("").map(ch => m[ch] ? "[" + m[ch] + m[ch].toUpperCase() + "]" : ch).join("")).join(".*"); };
async function osmFind(name) {
  const rx = osmRx(name), [S0, W0, N0, E0] = OSM_BBOX, q = `[out:json][timeout:25];nwr["name"~"${rx}",i]["amenity"~"^(${OSM_AMEN})$"](${S0},${W0},${N0},${E0});out tags center 40;`;
  let last = "";
  for (const m of OSM_MIRRORS) {
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(m + "/api/interpreter", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q), signal: ctl.signal });
      clearTimeout(to);
      if (r.ok) { const j = await r.json(); if (j && j.elements) return j.elements; }
      last = "erro " + r.status;
    } catch (e) { last = e.name === "AbortError" ? "demorou demais" : "sem resposta"; }
  }
  throw new Error(last);
}
function osmHits(els, name) {
  const n = norm(name);
  return els.filter(e => e.tags && e.tags.name).map(e => { const t = e.tags, x = e.lon ?? (e.center && e.center.lon), y = e.lat ?? (e.center && e.center.lat), nn = norm(t.name); return { e, t, x, y, sc: nn === n ? 0 : nn.startsWith(n) ? 1 : 2 }; })
    .filter(h => h.x != null && !(h.t["addr:city"] && norm(h.t["addr:city"]) !== "curitiba")).sort((a, b) => a.sc - b.sc || a.t.name.length - b.t.name.length).slice(0, 8);
}
function osmFindInner(ctx) {
  const o = OSMF && OSMF.ctx === ctx ? OSMF : null, have = new Set(S.items.filter(i => i.osm).map(i => i.osm.id));
  const hits = o ? o.hits.map((h, i) => {
    const t = h.t, ad = [[t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", "), t["addr:suburb"] || t["addr:neighbourhood"]].filter(Boolean).join(" — ");
    const sub = [osmCuisine(t), ad, t.opening_hours ? "com horário" : ""].filter(Boolean).join(" · "), dup = ctx === "cfg" && have.has(h.e.type + "/" + h.e.id);
    return `<button type="button" class="osmhit" data-act="${ctx === "ed" ? "osmpick" : "osmadd"}" data-i="${i}" ${dup ? "disabled" : ""}><b>${esc(t.name)}</b><small>${esc(sub || "sem detalhes no mapa")}</small>${dup ? "<small>já está na sua lista</small>" : ""}</button>`;
  }).join("") : "";
  return `<button type="button" class="btn sm" data-act="${ctx === "ed" ? "osmfind" : "osmsearch"}" ${o && o.busy ? "disabled" : ""}>${ico("search", 15)} ${o && o.busy ? "Buscando…" : "Buscar no OpenStreetMap"}</button>${o && o.err ? `<p class="hintp" style="margin:8px 0 0">${esc(o.err)}</p>` : ""}${hits ? `<p class="hintp" style="margin:8px 0 4px">Toque no certo para preencher o cadastro:</p><div class="osmhits">${hits}</div>` : ""}`;
}
function osmFindPaint() { const e = $(OSMF && OSMF.ctx === "ed" ? "#osmFind" : "#osmNameOut"); if (e) e.innerHTML = osmFindInner(OSMF.ctx); }
async function osmSearch(ctx) {
  const name = (($(ctx === "ed" ? "#f_title" : "#osmName") || {}).value || "").trim();
  if (name.length < 3) { toast("Digite pelo menos 3 letras do nome"); return; }
  OSMF = { ctx, q: name, busy: true, hits: [], err: "" }; osmFindPaint();
  try { OSMF.hits = osmHits(await osmFind(name), name); if (!OSMF.hits.length) OSMF.err = "Nada encontrado com esse nome em Curitiba. Confira a grafia ou preencha à mão."; }
  catch (e) { OSMF.err = "Não consegui consultar o OpenStreetMap agora (" + e.message + "). Tente de novo em instantes."; }
  OSMF.busy = false; osmFindPaint();
}
async function osmBairroFix(it, done) {
  if (!it.osm || it.osm.bairro || it.osm.lat == null) return;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&accept-language=pt-BR&lat=${it.osm.lat}&lon=${it.osm.lon}`);
    if (!r.ok) return; const a = ((await r.json()) || {}).address || {}, b = a.suburb || a.neighbourhood || a.city_district || "";
    if (b) { it.osm.bairro = b; if (!it.where || it.where === "Curitiba") it.where = b; done && done(b); }
  } catch (e) { }
}
function osmPick(i) {
  const h = OSMF && OSMF.hits[i]; if (!h || !ED) return;
  const it0 = osmItem(h.e, h.t, h.x, h.y, [], ""), known = [...places().values()].find(p => p.osm && p.osm.id === it0.osm.id);
  readForm();
  if (known && ED.isNew) { OSMF = null; $("#f_title").value = known.title; placeAutofill(); return; }
  const it = ED.it; it.title = it0.title; it.cuisine = (it0.cuisine || "").split(",")[0].trim() || it.cuisine; it.where = it0.where; it.hr = it0.osm.hr || it.hr; it.osm = it0.osm;
  ED.filled = "Dados importados do OpenStreetMap. Confira e complete o preço."; OSMF = null; drawEditor();
  osmBairroFix(it, b => { const w = $("#f_where"); if (ED && ED.it === it && w && (!w.value || w.value === "Curitiba")) w.value = b; });
  if (!ED.preview) osmFetchPhotoIntoEditor(it, true);
}
function osmAdd(i) {
  const h = OSMF && OSMF.hits[i]; if (!h) return;
  const it = osmItem(h.e, h.t, h.x, h.y, [], ""); if (S.items.some(x => x.osm && x.osm.id === it.osm.id)) { toast("Já está na sua lista"); return; }
  it.edited = true; S.items.push(it); save(it.id); osmFindPaint(); toast(`${it.title} entrou em Mesa › Quero ir`);
  osmBairroFix(it, () => save(it.id));
  fetchPlaceImage(it).then(r => { if (r && r.blob) { setImg(it.id, r.blob); render(); } }).catch(() => { });
}

/* ---------- Etapa 2 (Nível A): pipeline automático de foto do estabelecimento ---------- */
async function fetchBlobSafe(url, timeoutMs = 10000) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return null;
    const b = await r.blob();
    return b && b.size > 1024 && /^image\//.test(b.type || "") ? b : null;
  } catch (e) { return null; } finally { clearTimeout(to); }
}
async function wikimediaThumb(raw) {
  let title = String(raw || "").trim();
  if (!title) return null;
  if (/^https?:\/\//i.test(title)) {
    const m = title.match(/\/wiki\/(.+)$/);
    if (m) title = decodeURIComponent(m[1]);
    else return await fetchBlobSafe(title);
  }
  const isCat = /^category:/i.test(title);
  const url = isCat
    ? `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(title)}&gcmtype=file&gcmlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=700&format=json&origin=*`
    : `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(/^file:/i.test(title) ? title : "File:" + title)}&prop=imageinfo&iiprop=url&iiurlwidth=700&format=json&origin=*`;
  try {
    const r = await fetch(url); if (!r.ok) return null;
    const j = await r.json(), pages = (j && j.query && j.query.pages) || {};
    const pg = Object.values(pages)[0];
    const info = pg && pg.imageinfo && pg.imageinfo[0];
    const thumb = info && (info.thumburl || info.url);
    return thumb ? await fetchBlobSafe(thumb) : null;
  } catch (e) { return null; }
}
async function wikidataImage(qid) {
  if (!/^Q\d+$/i.test(qid || "")) return null;
  try {
    const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${encodeURIComponent(qid)}&property=P18&format=json&origin=*`);
    if (!r.ok) return null;
    const j = await r.json(), p18 = j && j.claims && j.claims.P18 && j.claims.P18[0];
    const file = p18 && p18.mainsnak && p18.mainsnak.datavalue && p18.mainsnak.datavalue.value;
    return file ? await wikimediaThumb(file) : null;
  } catch (e) { return null; }
}
async function panoramaxPhoto(lat, lon) {
  if (lat == null || lon == null) return null;
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(`https://api.panoramax.xyz/api/search?place_position=${lon},${lat}&place_distance=0-35&limit=3`, { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const j = await r.json(), feats = (j && j.features) || [];
    for (const f of feats) {
      const a = f && f.assets;
      const href = (a && a.sd && a.sd.href) || (a && a.thumb && a.thumb.href);
      if (href) { const b = await fetchBlobSafe(href); if (b) return b; }
    }
    return null;
  } catch (e) { clearTimeout(to); return null; }
}
function loadCorsImage(url, timeoutMs = 5000) {
  return new Promise(res => {
    const im = new Image(); let done = false;
    const fin = v => { if (done) return; done = true; clearTimeout(to); res(v); };
    const to = setTimeout(() => fin(null), timeoutMs);
    im.crossOrigin = "anonymous";
    im.onload = () => fin(im);
    im.onerror = () => fin(null);
    im.src = url;
  });
}
async function renderMiniMapFallback(it) {
  const o = it.osm || {}, W = 700, H = 525;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  /* Fundo base Caldeirão */
  ctx.fillStyle = "#F0E4C4"; ctx.fillRect(0, 0, W, H);
  let tilesOk = false;
  if (o.lat != null && o.lon != null && navigator.onLine) {
    const z = 16, n = 2 ** z;
    const xExact = ((o.lon + 180) / 360) * n;
    const latRad = o.lat * Math.PI / 180;
    const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
    const cx = Math.floor(xExact), cy = Math.floor(yExact);
    const ox = (xExact - cx) * 256, oy = (yExact - cy) * 256;
    const jobs = [];
    for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) {
      const tx = cx + dx, ty = cy + dy;
      const px = Math.round(W / 2 - ox + dx * 256), py = Math.round(H / 2 - oy + dy * 256);
      if (px > W || py > H || px + 256 < 0 || py + 256 < 0) continue;
      jobs.push(loadCorsImage(`https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`).then(im => ({ im, px, py })));
    }
    const tiles = await Promise.all(jobs);
    for (const t of tiles) if (t.im) { ctx.drawImage(t.im, t.px, t.py, 256, 256); tilesOk = true; }
  }
  if (!tilesOk) {
    /* Padrão vetorial elegante de mapa quando offline */
    ctx.strokeStyle = "#E0CFA0"; ctx.lineWidth = 3;
    for (let x = 0; x < W; x += 58) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 90, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 58) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 40); ctx.stroke(); }
    ctx.strokeStyle = "#2E7D4F"; ctx.globalAlpha = 0.25; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(0, H * 0.68); ctx.quadraticCurveTo(W * 0.45, H * 0.35, W, H * 0.55); ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    /* Tint suave quente Caldeirão sobre os tiles */
    ctx.fillStyle = "rgba(251, 243, 220, 0.18)";
    ctx.fillRect(0, 0, W, H);
  }
  /* Pino Caldeirão central */
  const px = W / 2, py = H / 2 - 10;
  ctx.fillStyle = "rgba(42, 15, 24, 0.24)";
  ctx.beginPath(); ctx.ellipse(px, py + 34, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6E1B33"; ctx.strokeStyle = "#FBF3DC"; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(px, py - 12, 26, Math.PI * 0.82, Math.PI * 2.18);
  ctx.lineTo(px, py + 32);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#B9E3A0";
  ctx.beginPath(); ctx.arc(px, py - 12, 10, 0, Math.PI * 2); ctx.fill();
  /* Selo do bairro */
  const badge = (o.bairro || it.where || "Curitiba").trim();
  if (badge) {
    ctx.font = "700 22px Manrope, system-ui, sans-serif";
    const tw = Math.min(W - 80, ctx.measureText(badge).width + 36);
    const bx = 22, by = 22, bh = 42;
    ctx.fillStyle = "#6E1B33"; ctx.fillRect(bx + 4, by + 4, tw, bh);
    ctx.fillStyle = "#FBF3DC"; ctx.strokeStyle = "#6E1B33"; ctx.lineWidth = 3;
    ctx.fillRect(bx, by, tw, bh); ctx.strokeRect(bx, by, tw, bh);
    ctx.fillStyle = "#2A0F18"; ctx.textBaseline = "middle";
    ctx.fillText(badge, bx + 18, by + bh / 2 + 1, tw - 36);
  }
  return await canvasToBlob(c, 0.8);
}

async function fetchPlaceImage(it) {
  const o = it && it.osm;
  if (!o) return null;
  let blob = null, source = "";
  /* 1. Tag nativa OSM image */
  if (o.im) {
    blob = await wikimediaThumb(o.im);
    if (blob) source = "OSM";
  }
  /* 2. Wikimedia Commons / Wikidata P18 */
  if (!blob && o.wc) {
    blob = await wikimediaThumb(o.wc);
    if (blob) source = "Wikimedia";
  }
  if (!blob && o.wd) {
    blob = await wikidataImage(o.wd);
    if (blob) source = "Wikidata";
  }
  /* 3. Panoramax (fachada por coordenada) */
  if (!blob && o.lat != null && o.lon != null) {
    blob = await panoramaxPhoto(o.lat, o.lon);
    if (blob) source = "Panoramax";
  }
  if (blob) {
    try { blob = await resizeImage(blob, 700, 0.78); } catch (e) { }
    return { blob, source };
  }
  /* 4. Fallback inteligente: mini-mapa estilizado Caldeirão */
  if (o.lat != null && o.lon != null) {
    const mapBlob = await renderMiniMapFallback(it);
    if (mapBlob) return { blob: mapBlob, source: "Mini-mapa" };
  }
  return null;
}

async function osmFetchPhotoIntoEditor(it, silent) {
  if (!it || !it.osm) { if (!silent) toast("Busque o lugar no OpenStreetMap primeiro"); return; }
  if (!silent) toast("Buscando foto do estabelecimento…");
  try {
    const res = await fetchPlaceImage(it);
    if (!res || !res.blob) { if (!silent) toast("Não consegui gerar a foto agora"); return; }
    if (ED && ED.it === it) {
      if (ED._rev && ED.preview && ED.preview.startsWith("blob:")) try { URL.revokeObjectURL(ED.preview); } catch (e) { }
      ED.photo = res.blob;
      ED.preview = URL.createObjectURL(res.blob);
      ED._rev = true;
      drawEditor();
      if (!silent) toast(`Imagem carregada (${res.source})`);
    }
  } catch (e) { if (!silent) toast("Não consegui buscar a foto"); }
}

let osmImgBusy = false, osmImgStop = false;
async function osmFetchPhotosBatch() {
  const out = h => { ui.osmImg = h; const e = $("#osmImgOut"); if (e) { e.hidden = false; e.innerHTML = h; } };
  if (osmImgBusy) return;
  const todo = S.items.filter(i => i.kind === "rest" && i.osm && i.osm.lat != null && !hasImg(i.id) && (i.status === "visto" || i.edited));
  if (!todo.length) return out("Todos os restaurantes visitados ou editados com mapa já têm imagem.");
  osmImgBusy = true; osmImgStop = false;
  let real = 0, maps = 0, n = 0;
  try {
    for (const it of todo) {
      if (osmImgStop) break;
      n++; out(`Buscando ${n} de ${todo.length}: ${esc(it.title)}…`);
      const res = await fetchPlaceImage(it);
      if (res && res.blob) {
        setImg(it.id, res.blob);
        if (res.source === "Mini-mapa") maps++; else real++;
      }
      await sleep(150);
    }
    out(`<b>${osmImgStop ? "Interrompido" : "Concluído"}.</b> ${real} fotos públicas (OSM/Wikimedia/Panoramax) e ${maps} mini-mapas gerados.`);
    render();
  } catch (e) { out("Erro ao buscar imagens: " + esc(e.message || e)); }
  osmImgBusy = false;
}

function osmCard() {
  const f = ui.osf, chk = (k, l) => `<label style="display:flex;gap:8px;align-items:center;font-size:14px;margin:4px 0"><input type="checkbox" data-osf="${k}" ${f[k] ? "checked" : ""}> ${l}</label>`;
  return `<div class="card2" id="sec-imp-osm"><h3>Importar restaurantes de Curitiba (OpenStreetMap)</h3><p class="muted" style="font-size:14px">Traz os lugares de comer e beber mapeados em Curitiba, com endereço, bairro, cozinha, telefone, site, Instagram, horário e comodidades quando existem. Eles entram em “Quero ir”, sem nota. Pode importar de novo: nada é duplicado. Leva alguns minutos e depende dos servidores públicos do OpenStreetMap, que às vezes ficam lentos.</p>
  <div class="fld" style="margin-top:12px"><label class="f" for="osmName">Buscar um restaurante pelo nome</label><input type="search" id="osmName" placeholder="ex.: Madalosso" autocomplete="off"><div id="osmNameOut" style="margin-top:8px">${osmFindInner("cfg")}</div></div>
  <p class="muted" style="font-size:14px;margin-top:14px">Ou importe a cidade inteira:</p>
  <div style="margin-top:6px">${Object.keys(OSM_TYPES).map(k => chk(k, OSM_TYPES[k][1])).join("")}</div>
  <div class="btns"><button class="btn primary" data-act="osmrun">Importar Curitiba</button><button class="btn" data-act="osmcancel">Parar</button><button class="btn danger" style="border:1px solid var(--danger)" data-act="osmundo">Desfazer a última importação</button></div>
  <div class="out" id="osmOut" ${ui.osm ? "" : "hidden"}>${ui.osm || ""}</div>
  <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
    <p class="muted" style="font-size:13.5px"><b>Fotos automáticas (gratuito):</b> busca fotos públicas no OpenStreetMap, Wikimedia Commons e Panoramax para restaurantes visitados ou editados sem foto, com mini-mapa estilizado quando não houver foto.</p>
    <div class="btns"><button class="btn" data-act="osmimgs">Completar fotos dos restaurantes</button><button class="btn" data-act="osmimgstop">Parar</button></div>
    <div class="out" id="osmImgOut" ${ui.osmImg ? "" : "hidden"}>${ui.osmImg || ""}</div>
  </div>
  <p class="attr">Dados © colaboradores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (licença ODbL) · Fotos públicas via Wikimedia Commons / Panoramax · Tiles Carto Voyager.</p></div>`;
}

async function osmQuery(q) {
  let last = "";
  for (let round = 0; round < 3 && !osmStop; round++) {
    for (const m of OSM_MIRRORS) {
      if (osmStop) break;
      const nome = m.replace("https://", "").split("/")[0];
      try {
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 150000);
        const r = await fetch(m + "/api/interpreter", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q), signal: ctl.signal });
        clearTimeout(to);
        if (r.ok) { const j = await r.json(); if (j && j.elements && !(j.remark && /error|timed out/i.test(j.remark))) return j.elements; last = nome + " (resposta incompleta)"; }
        else last = nome + " (erro " + r.status + ")";
      } catch (e) { last = nome + (e.name === "AbortError" ? " (demorou demais)" : " (sem resposta)"); }
    }
    if (!osmStop) await sleep(2500 * (round + 1));
  }
  throw new Error(osmStop ? "parado" : "os servidores do OpenStreetMap não responderam: " + last);
}
async function osmBoundary() {
  try {
    const r = await fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent("Curitiba, Paraná, Brasil") + "&featuretype=city&format=jsonv2&polygon_geojson=1&polygon_threshold=0.0003&limit=1&accept-language=pt-BR");
    const j = await r.json(), g = j[0] && j[0].geojson;
    return g && /Polygon/.test(g.type) ? g : null;
  } catch (e) { return null; }
}
const geoPolys = g => g.type === "Polygon" ? [g.coordinates] : g.coordinates;
function inRing(x, y, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function inGeo(x, y, g) { return geoPolys(g).some(p => inRing(x, y, p[0]) && !p.slice(1).some(h => inRing(x, y, h))); }
function stitch(ways) {
  const segs = ways.filter(w => w.length > 1).map(w => w.map(p => [p.lon, p.lat])), rings = [], eq = (a, b) => a[0] === b[0] && a[1] === b[1];
  while (segs.length) {
    let cur = segs.pop(), grew = true;
    while (grew && !eq(cur[0], cur[cur.length - 1])) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], e = cur[cur.length - 1];
        if (eq(s[0], e)) cur = cur.concat(s.slice(1)); else if (eq(s[s.length - 1], e)) cur = cur.concat(s.slice().reverse().slice(1)); else continue;
        segs.splice(i, 1); grew = true; break;
      }
    }
    if (cur.length > 3) rings.push(cur);
  }
  return rings;
}
async function osmBairros(city) {
  try {
    const els = await osmQuery(`[out:json][timeout:120];rel["boundary"="administrative"]["admin_level"="10"](${OSM_BBOX.join(",")});out geom;`), out = [];
    for (const e of els) {
      if (e.type !== "relation" || !e.tags || !e.tags.name) continue;
      const rings = stitch((e.members || []).filter(m => m.type === "way" && m.role !== "inner" && m.geometry).map(m => m.geometry));
      if (!rings.length) continue;
      const b = e.bounds || { minlon: Math.min(...rings[0].map(p => p[0])), maxlon: Math.max(...rings[0].map(p => p[0])), minlat: Math.min(...rings[0].map(p => p[1])), maxlat: Math.max(...rings[0].map(p => p[1])) };
      if (city && !inGeo((b.minlon + b.maxlon) / 2, (b.minlat + b.maxlat) / 2, city) && !inGeo(rings[0][0][0], rings[0][0][1], city)) continue;
      out.push({ name: e.tags.name, rings, b });
    }
    return out;
  } catch (e) { return []; }
}
const bairroDe = (bairros, x, y) => { const b = bairros.find(z => x >= z.b.minlon && x <= z.b.maxlon && y >= z.b.minlat && y <= z.b.maxlat && z.rings.some(r => inRing(x, y, r))); return b ? b.name : ""; };
function osmItem(e, t, x, y, bairros, batch) {
  const suburb = t["addr:suburb"] || t["addr:neighbourhood"] || "", bairro = suburb || bairroDe(bairros, x, y);
  const ig = (t["contact:instagram"] || t.instagram || "").trim(), web = (t.website || t["contact:website"] || t.url || "").trim();
  const ad = [[t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", "), bairro, t["addr:postcode"]].filter(Boolean).join(" — ");
  const it = newItem("rest", { title: t.name.trim(), cuisine: osmCuisine(t), where: bairro || "Curitiba", status: "quero", src: "osm", impOsm: batch });
  it.osm = Object.assign({
    id: e.type + "/" + e.id, a: t.amenity, lat: Math.round(y * 1e6) / 1e6, lon: Math.round(x * 1e6) / 1e6, bairro, ad,
    ph: (t.phone || t["contact:phone"] || t["contact:mobile"] || "").split(";")[0].trim(),
    web: /^https?:\/\//i.test(web) ? web : (web ? "https://" + web : ""),
    ig: ig ? (/^https?:\/\//i.test(ig) ? ig : "https://instagram.com/" + ig.replace(/^@/, "")) : "",
    hr: t.opening_hours || "", fl: osmFlags(t), br: t.brand || "", op: t.operator || "", ds: t["description:pt"] || t.description || ""
  }, osmExtraTags(t));
  return it;
}
async function osmRun() {
  if (osmBusy) return;
  const f = ui.osf, am = Object.keys(OSM_TYPES).filter(k => f[k]).map(k => OSM_TYPES[k][0]).join("|");
  if (!am) return osmOut("Marque pelo menos um tipo de lugar.");
  osmBusy = true; osmStop = false;
  const batch = "osm-" + Date.now();
  try {
    osmOut("Buscando o contorno de Curitiba…");
    const city = await osmBoundary();
    osmOut((city ? "Contorno de Curitiba ok." : "Sem o contorno oficial: uso a área retangular e o endereço para filtrar.") + " Buscando os bairros…");
    const bairros = await osmBairros(city);
    const [S0, W0, N0, E0] = OSM_BBOX, G = 3, seen = new Map();
    for (let i = 0; i < G && !osmStop; i++) for (let k = 0; k < G && !osmStop; k++) {
      const n = i * G + k + 1, bb = [S0 + (N0 - S0) * i / G, W0 + (E0 - W0) * k / G, S0 + (N0 - S0) * (i + 1) / G, W0 + (E0 - W0) * (k + 1) / G].map(v => v.toFixed(5)).join(",");
      osmOut(`${bairros.length ? bairros.length + " bairros identificados. " : "Bairros indisponíveis (uso só o endereço do OpenStreetMap). "}Baixando o mapa… parte ${n} de ${G * G}: ${seen.size} lugares até agora.`);
      const els = await osmQuery(`[out:json][timeout:90];nwr["amenity"~"^(${am})$"](${bb});out tags center;`);
      els.forEach(e => seen.set(e.type + "/" + e.id, e));
    }
    if (osmStop) { osmOut(`Interrompido antes de terminar. Nada foi importado (${seen.size} lugares baixados). Rode de novo para continuar.`); osmBusy = false; return; }
    const have = new Set(S.items.filter(i => i.osm).map(i => i.osm.id)), manual = new Set(S.items.filter(i => i.kind === "rest" && !i.osm).map(i => norm(i.title)));
    const st = { add: 0, dup: 0, fora: 0, semNome: 0, bairro: 0, tel: 0, hr: 0, web: 0, ig: 0, cuis: 0 };
    for (const e of seen.values()) {
      const t = e.tags || {}; if (!t.name || !t.name.trim()) { st.semNome++; continue; }
      const x = e.lon ?? (e.center && e.center.lon), y = e.lat ?? (e.center && e.center.lat); if (x == null || y == null) continue;
      if (city ? !inGeo(x, y, city) : (t["addr:city"] && norm(t["addr:city"]) !== "curitiba")) { st.fora++; continue; }
      if (have.has(e.type + "/" + e.id) || manual.has(norm(t.name))) { st.dup++; continue; }
      const it = osmItem(e, t, x, y, bairros, batch); S.items.push(it); st.add++;
      if (it.osm.bairro) st.bairro++; if (it.osm.ph) st.tel++; if (it.osm.hr) st.hr++; if (it.osm.web) st.web++; if (it.osm.ig) st.ig++; if (t.cuisine) st.cuis++;
    }
    S.lastOsm = batch; save();
    osmOut(`<b>Concluído.</b> ${st.add.toLocaleString("pt-BR")} lugares importados para Mesa › Quero ir. Com bairro: ${st.bairro}, cozinha: ${st.cuis}, telefone: ${st.tel}, horário: ${st.hr}, site: ${st.web}, Instagram: ${st.ig}. Ignorados: ${st.dup} já existentes, ${st.semNome} sem nome, ${st.fora} fora de Curitiba.`);
    render();
  } catch (e) { osmOut(`Não consegui terminar (${esc(e.message || e)}). Tente de novo em alguns minutos; nada foi importado.`); }
  osmBusy = false;
}
async function osmUndo() {
  const rm = S.items.filter(i => S.lastOsm && i.impOsm === S.lastOsm && !i.edited && i.status === "quero");
  if (!rm.length) return toast("Nada da última importação para desfazer");
  if (!(await askConfirm(`${rm.length} lugares da última importação (que vocês não alteraram) serão removidos.`, "Desfazer"))) return;
  const ids = new Set(rm.map(i => i.id)); rm.forEach(i => delImg(i.id));
  S.items = S.items.filter(i => !ids.has(i.id)); save(); osmOut(`${rm.length} lugares removidos.`); render();
}
const OSM_DIAS = { Mo: "Seg", Tu: "Ter", We: "Qua", Th: "Qui", Fr: "Sex", Sa: "Sáb", Su: "Dom", PH: "Feriados", off: "fechado" };
function osmInfoHTML(it) {
  const o = it.osm; if (!o) return "";
  const row = (l, v) => v ? `<div style="display:flex;gap:10px;margin:5px 0;font-size:14px"><b style="min-width:76px;flex:none">${l}</b><span style="min-width:0;overflow-wrap:anywhere">${v}</span></div>` : "";
  const a = (h, t) => { const u = safeUrl(h); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--accT)">${esc(t)}</a>` : esc(t); };
  const maps = o.lat != null ? a(`https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lon}`, "Abrir no mapa") : "";
  const tel = o.ph ? `<a href="tel:${esc(o.ph.replace(/[^\d+]/g, ""))}" style="color:var(--accT)">${esc(o.ph)}</a>` : "";
  const hr = o.hr ? esc(o.hr).replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|off)\b/g, m => OSM_DIAS[m]) : "";
  return `<div class="card2" style="margin:0 0 14px;padding:12px 14px"><p class="eyebrow" style="margin:0 0 6px">Sobre o lugar</p>${row("Endereço", esc(o.ad || ""))}${row("Mapa", maps)}${row("Telefone", tel)}${row("Site", o.web ? a(o.web, o.web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) : "")}${row("Instagram", o.ig ? a(o.ig, o.ig.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")) : "")}${row("Horário", hr)}${row("Comodidades", (o.fl || []).map(x => `<span class="pchip">${esc(x)}</span>`).join(""))}${row("Rede", esc(o.br || o.op || ""))}${row("Sobre", esc(o.ds || ""))}<p class="attr" style="margin:8px 0 0">Dados © colaboradores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL). Podem estar desatualizados.</p></div>`;
}
