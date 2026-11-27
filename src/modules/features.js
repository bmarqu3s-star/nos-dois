/* ---------- Etapa 3: Mapa Leaflet, Roleta, Retrospectiva, Card Compartilhável, .ics e Rewatches ---------- */

/* 1. Mapa interativo de restaurantes (Leaflet lazy) */
let LEAFLET_P = null, REST_MAP = null, REST_LAYER = null, USER_MARKER = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (LEAFLET_P) return LEAFLET_P;
  LEAFLET_P = new Promise((res, rej) => {
    if (!document.getElementById("lf-css")) {
      const lk = document.createElement("link");
      lk.id = "lf-css"; lk.rel = "stylesheet";
      lk.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(lk);
    }
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    sc.onload = () => window.L ? res(window.L) : rej(new Error("Leaflet indisponível"));
    sc.onerror = () => { LEAFLET_P = null; rej(new Error("Não consegui carregar o mapa (sem internet).")); };
    document.head.appendChild(sc);
  });
  return LEAFLET_P;
}
function unmountRestMap() {
  if (REST_MAP) { try { REST_MAP.remove(); } catch (e) { } REST_MAP = null; REST_LAYER = null; USER_MARKER = null; }
}
function mapFilteredPlaces() {
  const f = ui.map;
  let list = [...places().values()].filter(p => p.osm && p.osm.lat != null && p.osm.lon != null);
  list.forEach(p => {
    p._o = ohState(p.hours);
    p._dist = f.user ? haversineKm(f.user.lat, f.user.lon, p.osm.lat, p.osm.lon) : null;
  });
  if (f.st === "visto") list = list.filter(p => p.visits.length > 0);
  else if (f.st === "quero") list = list.filter(p => p.visits.length === 0);
  else if (f.st === "open") list = list.filter(p => p._o.known && p._o.open);
  if (f.near && f.user) list = list.filter(p => p._dist != null && p._dist <= (f.radius || 5)).sort((a, b) => a._dist - b._dist);
  return list;
}
function restMapHTML() {
  const f = ui.map, list = mapFilteredPlaces();
  const totalGeo = [...places().values()].filter(p => p.osm && p.osm.lat != null).length;
  const chips = [["all", "Todos"], ["visto", "Já fomos"], ["quero", "Quero ir"], ["open", "Abertos agora"]];
  return `<div class="mapbar">
    <div class="seg">${chips.map(c => `<button type="button" class="chip" data-act="mapst" data-v="${c[0]}" aria-pressed="${f.st === c[0]}">${c[1]}</button>`).join("")}
      <button type="button" class="chip" data-act="mapnear" aria-pressed="${!!f.near}">${ico("map", 14)} Perto de nós${f.near ? ` (${f.radius} km)` : ""}</button>
    </div>
    ${f.near ? `<select data-maprad="1" aria-label="Raio" style="width:auto;max-width:130px">${[1, 2, 5, 10, 20].map(km => `<option value="${km}" ${f.radius === km ? "selected" : ""}>Até ${km} km</option>`).join("")}</select>` : ""}
  </div>
  ${totalGeo ? `<div id="restMap" class="rest-map"><p class="muted" style="padding:48px 16px;text-align:center">Carregando mapa…</p></div>
  <div class="cleg" style="margin-top:8px">
    <span><i style="background:#2E7D4F"></i>Já fomos</span>
    <span><i style="background:#6E1B33"></i>Quero ir</span>
    <span><i style="background:#B9E3A0;border:2px solid #1F6A3E"></i>Aberto agora</span>
    <span class="muted">${list.length} ${list.length === 1 ? "lugar" : "lugares"} no mapa</span>
  </div>` : `<div class="empty"><p class="muted">Nenhum restaurante com localização do OpenStreetMap ainda. Use <b>Importar de Curitiba</b> ou busque um lugar pelo nome ao cadastrar.</p></div>`}`;
}
async function mountRestMap() {
  const host = $("#restMap");
  if (!host) return;
  try {
    const L = await loadLeaflet();
    if (!$("#restMap")) return;
    unmountRestMap();
    host.innerHTML = "";
    const f = ui.map, list = mapFilteredPlaces();
    const center = f.user ? [f.user.lat, f.user.lon] : [-25.4284, -49.2733];
    REST_MAP = L.map(host, { zoomControl: true }).setView(center, f.near ? 14 : 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
      maxZoom: 19
    }).addTo(REST_MAP);
    REST_LAYER = L.layerGroup().addTo(REST_MAP);
    if (f.user) {
      USER_MARKER = L.circleMarker([f.user.lat, f.user.lon], { radius: 9, fillColor: "#2A0F18", color: "#FBF3DC", weight: 3, fillOpacity: 1 }).addTo(REST_LAYER).bindPopup("<b>Vocês estão aqui</b>");
    }
    const bounds = [];
    for (const p of list.slice(0, 600)) {
      const visited = p.visits.length > 0, isOpen = p._o && p._o.known && p._o.open;
      const fill = visited ? "#2E7D4F" : "#6E1B33";
      const stroke = isOpen ? "#B9E3A0" : "#FBF3DC";
      const mk = L.circleMarker([p.osm.lat, p.osm.lon], { radius: visited ? 9 : 7, fillColor: fill, color: stroke, weight: isOpen ? 3.5 : 2, fillOpacity: 0.92 });
      const distTxt = p._dist != null ? ` · ${p._dist < 1 ? Math.round(p._dist * 1000) + " m" : p._dist.toFixed(1).replace(".", ",") + " km"}` : "";
      const pop = `<div class="mpop"><b>${esc(p.title)}</b><small>${esc([p.cuisine, p.where, p.price].filter(Boolean).join(" · "))}${distTxt}</small><div style="margin:6px 0">${ohPill(p)}${p.avg != null ? ` <span class="pill">★ ${fmt(Math.round(p.avg * 10) / 10)}</span>` : ""}</div><button type="button" class="btn sm primary" data-act="open" data-id="${p.open.id}">Abrir ficha</button></div>`;
      mk.bindPopup(pop);
      mk.addTo(REST_LAYER);
      bounds.push([p.osm.lat, p.osm.lon]);
    }
    if (bounds.length && !f.near) {
      if (bounds.length === 1) REST_MAP.setView(bounds[0], 15);
      else REST_MAP.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
    setTimeout(() => { if (REST_MAP) REST_MAP.invalidateSize(); }, 120);
  } catch (e) {
    if (host) host.innerHTML = `<p class="muted" style="padding:36px 16px;text-align:center">${esc(e.message || "Mapa indisponível offline.")}</p>`;
  }
}
function mapFindNearMe() {
  if (ui.map.near) { ui.map.near = false; render(); return; }
  if (!navigator.geolocation) { toast("Geolocalização não suportada neste aparelho"); return; }
  toast("Localizando vocês…");
  navigator.geolocation.getCurrentPosition(
    pos => {
      ui.map.user = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      ui.map.near = true;
      render();
    },
    () => toast("Não consegui obter a localização. Libere a permissão no navegador."),
    { enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 }
  );
}

/* 2. Roleta "O que vamos fazer hoje?" */
let ROUL = null;
function openRoulette(kind = "all") {
  ROUL = { kind, filmMode: "want", restOpen: true, restMaxP: 2, restNov: false, spinning: false, pick: null, previewTitle: "" };
  const ov = $("#feat");
  saveFocus(ov);
  ov.hidden = false; document.body.style.overflow = "hidden";
  drawRoulette();
  setTimeout(() => ov.querySelector('[data-act="featclose"]')?.focus(), 20);
}
function roulettePool() {
  const R = ROUL; if (!R) return [];
  const pool = [];
  if (R.kind === "all" || R.kind === "filme") {
    let fs = S.items.filter(i => i.kind === "filme" && i.status === "quero");
    if (R.filmMode === "want") { const w = fs.filter(isWant); if (w.length) fs = w; }
    else if (R.filmMode === "stream") fs = fs.filter(i => i.tm && i.tm.prov && (i.tm.prov.flat || []).length > 0);
    pool.push(...fs);
  }
  if (R.kind === "all" || R.kind === "rest") {
    let ps = [...places().values()];
    if (R.restNov) ps = ps.filter(p => !p.visits.length);
    if (R.restMaxP) ps = ps.filter(p => !priceN(p.price) || priceN(p.price) <= R.restMaxP);
    if (R.restOpen) ps = ps.filter(p => { const o = ohState(p.hours); return !o.known || o.open; });
    pool.push(...ps.map(p => p.open));
  }
  if (R.kind === "all" || R.kind === "show") {
    pool.push(...S.items.filter(i => i.kind === "show" && i.status === "quero"));
  }
  return pool;
}
function drawRoulette() {
  const R = ROUL, ov = $("#feat"); if (!R || !ov) return;
  const pool = roulettePool();
  const kinds = [["all", "Qualquer"], ["filme", "Filme"], ["rest", "Restaurante"], ["show", "Evento"]];
  const fOpts = R.kind === "all" || R.kind === "filme"
    ? `<div class="seg" style="margin-top:8px">${[["want", "Queremos ver"], ["stream", "No streaming"], ["any", "Todos os filmes"]].map(x => `<button type="button" class="chip" data-act="rfm" data-v="${x[0]}" aria-pressed="${R.filmMode === x[0]}">${x[1]}</button>`).join("")}</div>` : "";
  const rOpts = R.kind === "all" || R.kind === "rest"
    ? `<div class="seg" style="margin-top:8px">
        <button type="button" class="chip" data-act="rropen" aria-pressed="${R.restOpen}">Aberto agora</button>
        <button type="button" class="chip" data-act="rrprice" aria-pressed="${R.restMaxP === 2}">Até R$$</button>
        <button type="button" class="chip" data-act="rrnov" aria-pressed="${R.restNov}">Só novidades</button>
      </div>` : "";
  let resHTML = "";
  if (R.spinning) {
    resHTML = `<div class="roul-box spinning"><p class="eyebrow">Sorteando entre ${pool.length} opções…</p><h2 id="roulSpin">${esc(R.previewTitle || "…")}</h2></div>`;
  } else if (R.pick) {
    const it = R.pick, media = hasImg(it.id) ? imgTag(it.id, "thumb") : phHTML(it, "thumb");
    const sub = it.kind === "filme" ? [it.year, firstDir(it.director), it.tm && it.tm.prov && (it.tm.prov.flat || []).slice(0, 2).join(", ")].filter(Boolean).join(" · ")
      : it.kind === "rest" ? [it.cuisine, it.where, it.price].filter(Boolean).join(" · ")
      : [it.etype, it.where, fmtRange(it)].filter(Boolean).join(" · ");
    resHTML = `<div class="roul-box win"><p class="eyebrow">Escolhido para vocês!</p><div class="roul-win">${media}<div class="info"><span class="tag ${it.kind === "rest" ? "rest" : it.kind === "show" ? "show" : ""}">${KNAME[it.kind]}</span><h3>${esc(it.title)}</h3><p class="muted" style="font-size:13.5px;margin-top:3px">${esc(sub || "Sem detalhes extras")}</p></div></div>
    <div class="btns2" style="margin-top:14px"><button type="button" class="btn primary" data-act="roulopen" data-id="${it.id}">Ver ficha</button><button type="button" class="btn" data-act="roulplan" data-id="${it.id}">Programar p/ hoje</button><button type="button" class="btn" data-act="roulspin">${ico("dice", 16)} Girar de novo</button></div></div>`;
  } else {
    resHTML = `<div class="roul-box"><p class="muted">${pool.length ? `<b>${pool.length}</b> ${pool.length === 1 ? "opção pronta" : "opções prontas"} com esses filtros.` : "Nenhuma opção combina com esses filtros. Tente afrouxar algum filtro acima."}</p></div>`;
  }
  ov.innerHTML = `<div class="sheet" style="max-width:520px">
    <div class="m-head"><h2>${ico("dice", 22)} O que vamos fazer hoje?</h2><button type="button" class="x" data-act="featclose" aria-label="Fechar">✕</button></div>
    <div class="kseg">${kinds.map(k => `<button type="button" class="chip" data-act="rknd" data-v="${k[0]}" aria-pressed="${R.kind === k[0]}">${k[1]}</button>`).join("")}</div>
    ${fOpts}${rOpts}
    ${resHTML}
    <div class="acts"><span class="grow"></span><button type="button" class="btn primary" data-act="roulspin" ${!pool.length || R.spinning ? "disabled" : ""}>${ico("dice", 18)} Sortear agora</button></div>
  </div>`;
}
function spinRoulette() {
  const R = ROUL; if (!R || R.spinning) return;
  const pool = roulettePool();
  if (!pool.length) { toast("Nenhuma opção com esses filtros"); return; }
  R.spinning = true; R.pick = null;
  const winner = pool[Math.floor(Math.random() * pool.length)];
  drawRoulette();
  let step = 0, total = 16;
  const tick = () => {
    if (!ROUL || ROUL !== R) return;
    step++;
    const cur = step >= total ? winner : pool[Math.floor(Math.random() * pool.length)];
    const el = $("#roulSpin");
    if (el) el.textContent = cur.title;
    if (step >= total) {
      R.spinning = false; R.pick = winner;
      drawRoulette();
    } else {
      setTimeout(tick, 45 + step * 14);
    }
  };
  tick();
}

/* 3. Retrospectiva & Sintonia do Casal ("Nosso Ano") */
let RETRO = null;
function retroYears() {
  const ys = new Set([todayStr().slice(0, 4)]);
  for (const i of S.items) {
    if (i.status === "visto" && i.date) ys.add(i.date.slice(0, 4));
    if (Array.isArray(i.rewatches)) i.rewatches.forEach(rw => { if (rw && rw.date) ys.add(rw.date.slice(0, 4)); });
  }
  return [...ys].filter(y => /^\d{4}$/.test(y)).sort().reverse();
}
function syntonyLabel(s) {
  if (s == null) return "Avaliem juntos para medir";
  if (s >= 92) return "Sintonia perfeita";
  if (s >= 82) return "Super alinhados";
  if (s >= 70) return "Boa sintonia";
  if (s >= 55) return "Gostos complementares";
  return "Debates acalorados!";
}
function openRetro(year) {
  const ys = retroYears();
  RETRO = { year: year || ys[0] || todayStr().slice(0, 4), years: ys };
  const ov = $("#feat");
  saveFocus(ov);
  ov.hidden = false; document.body.style.overflow = "hidden";
  drawRetro();
  setTimeout(() => ov.querySelector('[data-act="featclose"]')?.focus(), 20);
}
function drawRetro() {
  const R = RETRO, ov = $("#feat"); if (!R || !ov) return;
  const st = computeRetro(S.items, R.year), N = S.names.map(esc);
  const pills = arr => arr.length ? arr.map(([k, n]) => `<span class="pchip">${esc(k)} <b>${n}</b></span>`).join("") : '<span class="muted" style="font-size:13px">—</span>';
  const itemLine = (it, extra) => `<div class="retro-row" role="button" tabindex="0" data-act="retroopen" data-id="${it.id}"><b>${esc(it.title)}</b><small>${extra}</small></div>`;
  ov.innerHTML = `<div class="sheet wide">
    <div class="m-head"><h2>${ico("spark", 22)} Nosso Ano · ${esc(R.year)}</h2><button type="button" class="x" data-act="featclose" aria-label="Fechar">✕</button></div>
    <div class="seg" style="margin-bottom:16px">${R.years.map(y => `<button type="button" class="chip" data-act="retroy" data-y="${y}" aria-pressed="${R.year === y}">${y}</button>`).join("")}</div>
    ${st.counts.total === 0 ? `<div class="empty"><p class="muted">Nenhum registro concluído em ${esc(R.year)} ainda.</p></div>` : `
    <div class="stats s4">
      <div class="stat film"><div class="n">${st.counts.filmes}${st.counts.rewatches ? `<small style="font-size:15px"> +${st.counts.rewatches}↻</small>` : ""}</div><div class="l">filmes vistos</div></div>
      <div class="stat food"><div class="n">${st.counts.rest}</div><div class="l">visitas a restaurantes</div></div>
      <div class="stat show"><div class="n">${st.counts.shows}</div><div class="l">eventos vividos</div></div>
      <div class="stat"><div class="n" style="font-size:${st.showSpend >= 10000 ? 22 : 26}px">${st.showSpend ? brl(st.showSpend) : "—"}</div><div class="l">investido em eventos</div></div>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <p class="eyebrow">Sintonia do casal</p>
      <div class="retro-syn">
        <div class="syn-score"><b>${st.syntony != null ? st.syntony + "%" : "—"}</b><span>${syntonyLabel(st.syntony)}</span></div>
        <div class="syn-bars">
          <div class="syn-track"><div class="syn-fill" style="width:${st.syntony || 0}%"></div></div>
          <p class="muted" style="font-size:13px;margin-top:6px">Médias: <b>${N[0]}</b> ${st.avgA != null ? fmt(Math.round(st.avgA * 10) / 10) : "—"} · <b>${N[1]}</b> ${st.avgB != null ? fmt(Math.round(st.avgB * 10) / 10) : "—"} · <b>Casal</b> ${st.avgCouple != null ? fmt(Math.round(st.avgCouple * 10) / 10) : "—"}</p>
          ${st.bothCount ? `<p class="muted" style="font-size:12.5px;margin-top:2px">${st.exactMatches} notas idênticas e ${st.closeMatches} quase iguais (≤ 0,5) em ${st.bothCount} avaliações a dois.</p>` : ""}
        </div>
      </div>
    </div>
    <div class="two" style="margin-bottom:16px">
      <div class="card2" style="margin:0"><h3>Onde mais concordamos</h3>${st.agreed.length ? st.agreed.map(it => itemLine(it, `${N[0]} ${fmt(it.ra)} · ${N[1]} ${fmt(it.rb)} · ★ ${fmt(it.rating)}`)).join("") : '<p class="muted" style="font-size:13px;margin-top:8px">Avaliem juntos para ver.</p>'}</div>
      <div class="card2" style="margin:0"><h3>Maiores divergências</h3>${st.diverged.length ? st.diverged.map(d => itemLine(d.item, `${N[0]} ${fmt(d.item.ra)} vs ${N[1]} ${fmt(d.item.rb)} (dif. ${fmt(d.diff)})`)).join("") : '<p class="muted" style="font-size:13px;margin-top:8px">Nenhuma grande divergência este ano!</p>'}</div>
    </div>
    <div class="two" style="margin-bottom:16px">
      <div class="card2" style="margin:0"><h3>Gêneros favoritos</h3><div style="margin-top:8px">${pills(st.topGenres)}</div></div>
      <div class="card2" style="margin:0"><h3>Cozinhas favoritas</h3><div style="margin-top:8px">${pills(st.topCuisines)}</div></div>
    </div>`}
    <div class="acts">${st.counts.total > 0 ? `<button type="button" class="btn primary" data-act="shareretro" data-y="${esc(R.year)}">${ico("share", 16)} Compartilhar retrospectiva</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="featclose">Fechar</button></div>
  </div>`;
}
function closeFeat() {
  const ov = $("#feat");
  ROUL = null; RETRO = null;
  ov.hidden = true;
  document.body.style.overflow = $("#modal").hidden && $("#tmx").hidden ? "" : "hidden";
  restoreFocus(ov);
}

/* 4. Card compartilhável (WhatsApp / Instagram Stories via Canvas) */
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function wrapLines(ctx, text, maxW, maxLines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; if (lines.length === maxLines) break; }
    else cur = test;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.length > 0 && lines.join(" ").length < text.length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  return lines;
}
async function shareCanvasBlob(canvas, filename, title) {
  const blob = await new Promise(res => canvas.toBlob(b => res(b), "image/png"));
  if (!blob) return toast("Não consegui gerar o card");
  const file = new File([blob], filename, { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Card salvo como imagem PNG");
}
async function shareItemCard(itemId) {
  const it = findIt(itemId); if (!it) return;
  toast("Gerando card…");
  const W = 1080, H = 1920;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  /* Fundo Caldeirão */
  ctx.fillStyle = "#FBF3DC"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2E7D4F"; ctx.fillRect(0, 0, W, 170);
  ctx.fillStyle = "#1E5A38"; ctx.fillRect(0, 170, W, 8);
  /* Cabeçalho marca */
  ctx.fillStyle = "#FBF3DC"; ctx.font = "800 54px 'Bricolage Grotesque', system-ui, sans-serif";
  ctx.fillText("Nós Dois", 72, 108);
  ctx.font = "600 28px Manrope, system-ui, sans-serif"; ctx.fillStyle = "#C6E6CC";
  ctx.fillText(`${S.names[0]} & ${S.names[1]}`, 72, 146);
  /* Moldura principal com sombra offset Caldeirão */
  const cx = 72, cy = 240, cw = W - 144, ch = 1480;
  ctx.fillStyle = "#6E1B33"; drawRoundRect(ctx, cx + 16, cy + 16, cw, ch, 36); ctx.fill();
  ctx.fillStyle = "#FFF9E8"; drawRoundRect(ctx, cx, cy, cw, ch, 36); ctx.fill();
  ctx.strokeStyle = "#6E1B33"; ctx.lineWidth = 8; ctx.stroke();

  /* Imagem / pôster */
  const ix = cx + 44, iy = cy + 44, iw = cw - 88, ih = it.kind === "rest" ? 640 : 860;
  ctx.save();
  drawRoundRect(ctx, ix, iy, iw, ih, 24); ctx.clip();
  let drew = false;
  if (hasImg(it.id)) {
    const blob = await getImgBlob(it.id);
    if (blob) {
      const u = URL.createObjectURL(blob);
      try {
        const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = rej; x.src = u; });
        const sc = Math.max(iw / im.naturalWidth, ih / im.naturalHeight);
        const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
        ctx.drawImage(im, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
        drew = true;
      } catch (e) { } finally { URL.revokeObjectURL(u); }
    }
  }
  if (!drew) {
    const g = CUR.gr[hash(it.title + it.kind) % CUR.gr.length];
    const gr = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
    gr.addColorStop(0, g[0]); gr.addColorStop(1, g[1]);
    ctx.fillStyle = gr; ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = "rgba(251,243,220,.35)"; ctx.font = "800 180px 'Bricolage Grotesque', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ini = (it.title || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    ctx.fillText(ini, ix + iw / 2, iy + ih / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  drawRoundRect(ctx, ix, iy, iw, ih, 24); ctx.strokeStyle = "#6E1B33"; ctx.lineWidth = 5; ctx.stroke();

  /* Selo de nota adesivo */
  if (it.rating != null) {
    ctx.save();
    ctx.translate(ix + iw - 92, iy + 92); ctx.rotate(-0.14);
    ctx.fillStyle = "#6E1B33"; ctx.beginPath(); ctx.arc(8, 8, 76, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FBF3DC"; ctx.strokeStyle = "#6E1B33"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 76, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6E1B33"; ctx.font = "800 54px Manrope, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(fmt(it.rating), 0, 2);
    ctx.restore();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  /* Categoria + título + metadados */
  let y = iy + ih + 64;
  const kindCol = it.kind === "rest" ? "#2E7D4F" : it.kind === "show" ? "#8A5A00" : "#6E1B33";
  ctx.fillStyle = kindCol; ctx.font = "800 28px Manrope, system-ui, sans-serif";
  ctx.fillText((KNAME[it.kind] || "").toUpperCase() + (it.date ? " · " + fmtRange(it) : ""), ix, y);
  y += 66;
  ctx.fillStyle = "#2A0F18"; ctx.font = "800 58px 'Bricolage Grotesque', system-ui, sans-serif";
  const tLines = wrapLines(ctx, it.title || "", iw, 2);
  for (const ln of tLines) { ctx.fillText(ln, ix, y); y += 68; }
  const sub = it.kind === "filme" ? [it.year, firstDir(it.director), it.genre].filter(Boolean).join(" · ")
    : it.kind === "rest" ? [it.cuisine, it.where, it.price].filter(Boolean).join(" · ")
    : [it.etype, it.where, it.city].filter(Boolean).join(" · ");
  if (sub) {
    ctx.fillStyle = "#6A4A52"; ctx.font = "600 30px Manrope, system-ui, sans-serif";
    ctx.fillText(wrapLines(ctx, sub, iw, 1)[0] || "", ix, y);
    y += 54;
  }

  /* Notas individuais */
  if (it.ra != null || it.rb != null || it.rating != null) {
    y += 10;
    const bw = (iw - 24) / 2, bh = 110;
    const drawScoreBox = (x, label, val) => {
      ctx.fillStyle = "#F0E4C4"; drawRoundRect(ctx, x, y, bw, bh, 20); ctx.fill();
      ctx.strokeStyle = "#E0CFA0"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#6A4A52"; ctx.font = "700 26px Manrope, system-ui, sans-serif";
      ctx.fillText(label, x + 24, y + 44);
      ctx.fillStyle = "#6E1B33"; ctx.font = "800 44px 'Bricolage Grotesque', system-ui, sans-serif";
      ctx.fillText(val != null ? fmt(val) + " / 10" : "—", x + 24, y + 92);
    };
    drawScoreBox(ix, S.names[0], it.ra);
    drawScoreBox(ix + bw + 24, S.names[1], it.rb);
    y += bh + 36;
  }

  /* Comentário curto */
  if (it.notes) {
    ctx.fillStyle = "#2A0F18"; ctx.font = "500 30px Manrope, system-ui, sans-serif";
    const nLines = wrapLines(ctx, "“" + it.notes.trim() + "”", iw, 3);
    for (const ln of nLines) { if (y < cy + ch - 40) { ctx.fillText(ln, ix, y); y += 42; } }
  }

  /* Rodapé */
  ctx.fillStyle = "#6A4A52"; ctx.font = "600 26px Manrope, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("nos-dois · diário a dois de cinema, mesa & eventos", W / 2, H - 76);
  const slug = norm(it.title || "card").replace(/\s+/g, "-").slice(0, 40) || "card";
  await shareCanvasBlob(c, `nos-dois-${slug}.png`, it.title || "Nós Dois");
}

async function shareRetroCard(year) {
  const st = computeRetro(S.items, year);
  toast("Gerando card da retrospectiva…");
  const W = 1080, H = 1920;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#FBF3DC"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2E7D4F"; ctx.fillRect(0, 0, W, 240);
  ctx.fillStyle = "#FBF3DC"; ctx.font = "800 68px 'Bricolage Grotesque', system-ui, sans-serif";
  ctx.fillText(`Nosso Ano · ${year}`, 72, 134);
  ctx.fillStyle = "#C6E6CC"; ctx.font = "600 32px Manrope, system-ui, sans-serif";
  ctx.fillText(`${S.names[0]} & ${S.names[1]}`, 72, 192);

  const box = (x, y, w, h, title, val, col = "#6E1B33") => {
    ctx.fillStyle = "#6E1B33"; drawRoundRect(ctx, x + 10, y + 10, w, h, 28); ctx.fill();
    ctx.fillStyle = "#FFF9E8"; drawRoundRect(ctx, x, y, w, h, 28); ctx.fill();
    ctx.strokeStyle = "#6E1B33"; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = col; ctx.font = "800 76px 'Bricolage Grotesque', system-ui, sans-serif";
    ctx.fillText(String(val), x + 36, y + 104);
    ctx.fillStyle = "#6A4A52"; ctx.font = "700 28px Manrope, system-ui, sans-serif";
    ctx.fillText(title, x + 36, y + 154);
  };
  const cw = (W - 144 - 32) / 2;
  box(72, 300, cw, 196, "filmes vistos", st.counts.filmes + (st.counts.rewatches ? ` (+${st.counts.rewatches}↻)` : ""), "#6E1B33");
  box(72 + cw + 32, 300, cw, 196, "restaurantes", st.counts.rest, "#2E7D4F");
  box(72, 530, cw, 196, "eventos vividos", st.counts.shows, "#8A5A00");
  box(72 + cw + 32, 530, cw, 196, "média do casal", st.avgCouple != null ? fmt(Math.round(st.avgCouple * 10) / 10) : "—", "#2A0F18");

  /* Card Sintonia */
  const sy = 780, sh = 320;
  ctx.fillStyle = "#6E1B33"; drawRoundRect(ctx, 84, sy + 12, W - 144, sh, 32); ctx.fill();
  ctx.fillStyle = "#B9E3A0"; drawRoundRect(ctx, 72, sy, W - 144, sh, 32); ctx.fill();
  ctx.strokeStyle = "#6E1B33"; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = "#2A0F18"; ctx.font = "800 32px Manrope, system-ui, sans-serif";
  ctx.fillText("SINTONIA DO CASAL", 116, sy + 72);
  ctx.font = "800 120px 'Bricolage Grotesque', system-ui, sans-serif"; ctx.fillStyle = "#6E1B33";
  ctx.fillText(st.syntony != null ? st.syntony + "%" : "—", 116, sy + 204);
  ctx.fillStyle = "#2A0F18"; ctx.font = "700 34px Manrope, system-ui, sans-serif";
  ctx.fillText(syntonyLabel(st.syntony), 116, sy + 266);

  /* Destaques */
  let dy = 1170;
  const sec = (label, text) => {
    ctx.fillStyle = "#6E1B33"; ctx.font = "800 28px Manrope, system-ui, sans-serif"; ctx.fillText(label.toUpperCase(), 72, dy); dy += 48;
    ctx.fillStyle = "#2A0F18"; ctx.font = "700 38px 'Bricolage Grotesque', system-ui, sans-serif";
    ctx.fillText(wrapLines(ctx, text, W - 144, 1)[0] || "—", 72, dy); dy += 76;
  };
  if (st.bestItem) sec("Melhor nota do ano", `${st.bestItem.title} (★ ${fmt(st.bestItem.rating)})`);
  if (st.topGenres.length) sec("Gêneros favoritos", st.topGenres.slice(0, 3).map(g => g[0]).join(" · "));
  if (st.topCuisines.length) sec("Cozinhas favoritas", st.topCuisines.slice(0, 3).map(g => g[0]).join(" · "));
  if (st.showSpend) sec("Investido em eventos", brl(st.showSpend));

  ctx.fillStyle = "#6A4A52"; ctx.font = "600 28px Manrope, system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Nós Dois · Retrospectiva " + year, W / 2, H - 80);
  await shareCanvasBlob(c, `nos-dois-retrospectiva-${year}.png`, `Nós Dois — Retrospectiva ${year}`);
}

/* 5. Exportar evento da Agenda para calendário (.ics) */
function exportICS(itemId) {
  const it = findIt(itemId);
  if (!it || !it.date) { toast("Defina uma data primeiro"); return; }
  const ics = buildICS(it);
  const slug = norm(it.title || "evento").replace(/\s+/g, "-").slice(0, 40) || "evento";
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${slug}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Evento exportado (.ics)");
}

/* 6. Rewatches para filmes */
function rewatchesHTML(it) {
  const rws = it.rewatches || [];
  const rows = rws.map((r, idx) => `<div class="attrow"><span class="attic" style="color:var(--filmT)">${ico("repeat", 16)}</span><span class="attn" style="cursor:default">${esc(fmtDate(r.date) || "Sem data")}${r.where ? " · " + esc(r.where) : ""}${r.notes ? " — " + esc(r.notes) : ""}</span><button type="button" class="x" data-act="rwrm" data-i="${idx}" aria-label="Remover rewatch">✕</button></div>`).join("");
  return `<div class="card2" style="margin:0 0 14px;padding:12px 14px">
    <p class="eyebrow" style="margin:0 0 6px">Rewatches (${rws.length})</p>
    ${rows || '<p class="muted" style="font-size:13px;margin-bottom:8px">Assistiram de novo? Registre cada sessão aqui.</p>'}
    <div class="row2" style="margin-top:8px"><input type="date" id="rw_date" value="${todayStr()}" aria-label="Data do rewatch"><input type="text" id="rw_where" list="dl-w" placeholder="Onde reviram…" aria-label="Onde reviram"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><input type="text" id="rw_notes" placeholder="Alguma nota dessa sessão (opcional)" aria-label="Nota do rewatch" style="flex:1"><button type="button" class="btn sm" data-act="rwadd">${ico("repeat", 15)} Registrar</button></div>
  </div>`;
}
