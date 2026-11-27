/* ---------- anexos de eventos: ingressos e line-up (foto ou PDF, Blob no IndexedDB) ---------- */
const AF = new Set(), ACH = 700000, AMAX = 8500000;
const attMeta = (it, t) => ((it && it.att) || []).filter(a => !t || a.t === t);
const findIt = id => (ED && ED.it && ED.it.id === id) ? ED.it : S.items.find(i => i.id === id);
function attGC() {
  if (ED) return;
  const used = new Set(S.items.flatMap(i => (i.att || []).map(a => a.id)));
  [...ATT_KEYS].forEach(id => { if (!used.has(id)) delAttLocal(id); });
}
async function attRead(file, ty) {
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (pdf) {
    if (file.size > 6e6) throw new Error("PDF maior que 6 MB");
    return { blob: file, m: "application/pdf", c: Math.ceil((file.size * 1.37) / ACH) };
  }
  if (!/^image\//.test(file.type)) throw new Error("Use uma foto ou um PDF");
  const blob = await resizeImage(file, ty === "lineup" ? 2400 : 1800, 0.86);
  if (blob.size * 1.37 > AMAX) throw new Error("Imagem grande demais");
  return { blob, m: blob.type || "image/jpeg", c: Math.ceil((blob.size * 1.37) / ACH) };
}
let PDFJS = null;
function loadPdfJs() {
  if (PDFJS) return PDFJS;
  PDFJS = new Promise((res, rej) => {
    const sc = document.createElement("script"); sc.src = "vendor/pdf.min.js";
    sc.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js"; res(window.pdfjsLib); } catch (e) { rej(e); } };
    sc.onerror = () => { PDFJS = null; rej(new Error("Leitor de PDF indisponível")); };
    document.head.appendChild(sc);
  });
  return PDFJS;
}
const warmPdf = () => loadPdfJs().then(() => fetch("vendor/pdf.worker.min.js").catch(() => { })).catch(() => { });
async function pdfRender(blob, host, z) {
  const lib = await loadPdfJs();
  const u8 = new Uint8Array(await blob.arrayBuffer());
  const pdf = await lib.getDocument({ data: u8 }).promise;
  host.innerHTML = "";
  for (let n = 1; n <= Math.min(pdf.numPages, 12); n++) {
    const pg = await pdf.getPage(n), base = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 1800 / base.width });
    const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height); c.style.width = z * 100 + "%";
    host.appendChild(c);
    await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  }
}
async function attFetch(a) {
  if (hasAtt(a.id)) return true;
  if (AF.has(a.id) || !SY.cid || !SY.F || !SY.fs || !navigator.onLine) return false;
  AF.add(a.id);
  try {
    const { doc, getDoc } = SY.F, parts = [];
    for (let n = 0; n < (a.c || 1); n++) { const sn = await getDoc(doc(SY.fs, "couples", SY.cid, "files", a.id + "_" + n)); if (!sn.exists()) throw new Error("falta parte"); parts.push(sn.data().d); }
    attSave(a.id, parts.join("")); SY.aup[a.id] = a.c || 1; syPersist(); return true;
  } catch (e) { return false; } finally { AF.delete(a.id); }
}
let afm = false;
async function attFetchMissing() {
  if (afm || !SY.cid || !SY.F || !SY.fs || !navigator.onLine) return;
  afm = true;
  try { for (const it of S.items) for (const a of (it.att || [])) if (!hasAtt(a.id)) await attFetch(a); } finally { afm = false; }
  if (!ED && !AV) render();
}
let AV = null, wakeL = null;
function openAtt(itemId, ty, aid) {
  const it = findIt(itemId); if (!it) return;
  const list = attMeta(it, ty); if (!list.length) return;
  AV = { it, list, i: Math.max(0, list.findIndex(a => a.id === aid)), z: 1 };
  const v = $("#attv");
  saveFocus(v);
  v.hidden = false; document.body.style.overflow = "hidden";
  try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { wakeL = l; }).catch(() => { }); } catch (e) { }
  drawAtt();
  setTimeout(() => v.querySelector('[data-act="avclose"]')?.focus(), 20);
}
function closeAtt() {
  const v = $("#attv");
  v.hidden = true; AV = null; if (!ED) document.body.style.overflow = "";
  try { if (wakeL) wakeL.release(); } catch (e) { } wakeL = null;
  restoreFocus(v);
}
async function drawAtt() {
  if (!AV) return;
  const A = AV, a = A.list[A.i], v = $("#attv"), n = A.list.length, pdf = a.m === "application/pdf";
  v.innerHTML = `<div class="av-top"><button class="btn" data-act="avclose" aria-label="Fechar">✕</button><b>${esc(a.n)}${n > 1 ? ` · ${A.i + 1}/${n}` : ""}<small>${esc(A.it.title || "")}${a.t === "lineup" ? " · line-up" : " · ingresso"}</small></b><button class="btn" data-act="avz" data-z="-1" aria-label="Diminuir">−</button><button class="btn" data-act="avz" data-z="1" aria-label="Ampliar">+</button><button class="btn" data-act="avshare" aria-label="Salvar ou compartilhar">${ico("share", 18)}</button></div><div class="av-body" id="avb"></div>${n > 1 ? `<div class="av-nav">${A.list.map((x, k) => `<button class="chip" data-act="avgo" data-k="${k}" aria-pressed="${k === A.i}">${esc(x.n)}</button>`).join("")}</div>` : ""}`;
  let body = $("#avb"), blob = await getAttBlob(a.id);
  if (!blob) {
    body.innerHTML = `<p class="av-msg">Baixando da nuvem…</p>`;
    const ok = await attFetch(a); if (!AV || AV !== A || A.list[A.i] !== a) return;
    blob = await getAttBlob(a.id);
    if (!ok || !blob) { $("#avb").innerHTML = `<p class="av-msg">Este arquivo ainda não chegou neste aparelho.<br>Conecte-se à internet e tente de novo.</p><button class="btn" data-act="avretry">Tentar de novo</button>`; return; }
  }
  if (!AV || AV !== A || A.list[A.i] !== a) return;
  body = $("#avb");
  if (!pdf) {
    const url = mediaCacheSet("a:" + a.id, blob);
    body.innerHTML = `<img src="${url}" alt="${esc(a.n)}" style="width:${A.z * 100}%">`;
    return;
  }
  body.innerHTML = `<p class="av-msg">Abrindo PDF…</p>`;
  try { await pdfRender(blob, body, A.z); } catch (e) { if (AV === A && A.list[A.i] === a) body.innerHTML = `<p class="av-msg">Não consegui mostrar este PDF aqui.<br>Use o botão de compartilhar para abri-lo em outro app.</p>`; }
}
function avZoom(dz) {
  if (!AV) return;
  AV.z = Math.min(4, Math.max(1, AV.z + dz * 0.5));
  document.querySelectorAll("#avb img, #avb canvas").forEach(e => { e.style.width = AV.z * 100 + "%"; });
}
async function attShare() {
  if (!AV) return;
  const a = AV.list[AV.i], blob = await getAttBlob(a.id); if (!blob) return;
  const ext = a.m === "application/pdf" ? "pdf" : (blob.type === "image/webp" ? "webp" : "jpg");
  const f = new File([blob], (a.n || "anexo") + "." + ext, { type: blob.type || a.m });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: a.n }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  const url = URL.createObjectURL(blob), l = document.createElement("a"); l.href = url; l.download = f.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function attList(it, ty) {
  return attMeta(it, ty).map(a => `<div class="attrow"><span class="attic">${ico(a.m === "application/pdf" ? "doc" : "img", 18)}</span><button type="button" class="attn" data-act="attopen" data-id="${it.id}" data-t="${ty}" data-a="${a.id}">${esc(a.n)}</button><button type="button" class="x" data-act="attrm" data-a="${a.id}" aria-label="Remover anexo">✕</button></div>`).join("");
}
function attFields(it) {
  return `<div class="attbox"><label class="f">Ingressos (foto ou PDF)</label>${attList(it, "ticket")}<button type="button" class="btn sm" data-act="pick" data-in="fTk">${ico("plus", 15)} Adicionar ingresso</button><input type="file" id="fTk" data-att="ticket" accept="image/*,application/pdf" multiple hidden></div>
  <div class="attbox"><label class="f">Line-up e horários (foto ou PDF)</label>${attList(it, "lineup")}<button type="button" class="btn sm" data-act="pick" data-in="fLu">${ico("plus", 15)} Adicionar line-up</button><input type="file" id="fLu" data-att="lineup" accept="image/*,application/pdf" multiple hidden></div>`;
}

/* ---------- importação Letterboxd & pôsteres ---------- */
function importLB(d) {
  const before = S.items.length;
  const r = importLBItems(S.items, d, newItem);
  for (let i = before; i < S.items.length; i++) markDirty(S.items[i].id);
  markDirty(r.touchedIds);
  return r;
}
let JSZIP = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (JSZIP) return JSZIP;
  JSZIP = new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    sc.onload = () => window.JSZip ? res(window.JSZip) : rej(new Error("O leitor de ZIP não carregou. Envie os arquivos CSV direto."));
    sc.onerror = () => { JSZIP = null; rej(new Error("O leitor de ZIP não carregou. Verifique a conexão ou envie os arquivos CSV direto.")); };
    document.head.appendChild(sc);
  });
  return JSZIP;
}
async function handleImport(files) {
  const out = {}, add = (k, rows) => (out[k] = out[k] || []).push(...rows);
  try {
    for (const f of files) {
      const n = f.name.toLowerCase();
      if (n.endsWith(".zip")) {
        const JSZip = await loadJSZip();
        const z = await JSZip.loadAsync(f);
        for (const name of Object.keys(z.files)) {
          const e = z.files[name];
          if (e.dir || name.includes("/") || !name.toLowerCase().endsWith(".csv")) continue;
          classifyLB(name, parseCSV(await e.async("string")), add);
        }
      } else if (n.endsWith(".csv")) classifyLB(f.name, parseCSV(await f.text()), add);
    }
    if (!Object.keys(out).length) { ui.imp = "Não encontrei arquivos do Letterboxd (watched, ratings, diary, watchlist ou reviews)."; return render(); }
    const r = importLB(out); save();
    const parts = Object.keys(out).map(k => `${k}: ${out[k].length}`).join(" · ");
    ui.imp = `<b>Importação concluída.</b><ul><li>${r.created} filmes novos (${r.wl} na lista “quero ver”)</li><li>${r.updated} filmes já existentes atualizados</li><li class="muted">Linhas lidas — ${esc(parts)}</li></ul>Agora abram <b>Filmes › Por avaliar</b> para dar a nota de vocês.`;
    toast("Letterboxd importado");
  } catch (e) { ui.imp = "Erro na importação: " + esc(e.message || e); }
  render();
}
async function handlePosters(files) {
  let ok = 0; const miss = [];
  for (const f of files) {
    const base = f.name.replace(/\.[^.]+$/, "");
    const ym = base.match(/\(?\b((?:19|20)\d{2})\b\)?\s*$/), year = ym ? ym[1] : "";
    const nm = norm(base.replace(/\(?\b(?:19|20)\d{2}\b\)?\s*$/, "")) || norm(base);
    let cands = S.items.filter(i => norm(i.title) === nm);
    if (cands.length > 1 && year) cands = cands.filter(i => i.year === year);
    if (!cands.length) { miss.push(f.name); continue; }
    try { const b = await resizeImage(f); setImg(cands[0].id, b); ok++; } catch (e) { miss.push(f.name); }
  }
  ui.pst = `<b>${ok}</b> imagem(ns) ligada(s).${miss.length ? `<br>Sem correspondência (${miss.length}): ${esc(miss.slice(0, 12).join(", "))}${miss.length > 12 ? "…" : ""}` : ""}`;
  toast(ok + " imagens adicionadas"); render();
}

/* ---------- exportações ---------- */
async function offerDownload(filename, data) {
  let dl = null;
  try { dl = window.claude && (await claude.use("downloads")); } catch (e) { }
  if (!dl) {
    try {
      const blob = new Blob([data], { type: filename.endsWith(".csv") ? "text/csv;charset=utf-8" : "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast("Arquivo salvo");
    } catch (e) { toast("Não foi possível salvar o arquivo"); }
    return;
  }
  try { await dl.save({ filename, data }); toast("Arquivo salvo"); } catch (e) { if (!e || e.code !== "declined") toast("Não foi possível salvar o arquivo"); }
}
async function exportBackup() {
  toast("Preparando backup…");
  const imgs = {}, atts = {};
  for (const id of IMG_KEYS) { const d = await getImgDataUrl(id); if (d) imgs[id] = d; }
  for (const id of ATT_KEYS) { const d = await getAttDataUrl(id); if (d) atts[id] = d; }
  await offerDownload(`nos-dois-backup-${todayStr()}.json`, JSON.stringify({ app: "nos-dois", v: 1, exported: new Date().toISOString(), names: S.names, theme: S.theme, catalogV: S.catalogV, items: S.items, imgs, atts }));
}
function exportCSV() {
  const cols = ["tipo", "titulo", "ano", "situacao", "data", "onde", "nota_casal", "nota_" + S.names[0], "nota_" + S.names[1], "nota_letterboxd", "diretor", "genero", "titulo_original", "duracao_min", "classificacao", "nota_tmdb", "sinopse", "cozinha", "preco", "pratos", "comentarios", "tipo_evento", "cidade", "artistas", "data_fim", "gasto", "ingresso", "melhor_momento", "rewatches"];
  const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const lines = S.items.map(i => [({ filme: "filme", rest: "restaurante", show: "evento" })[i.kind], i.title, i.year, i.status === "visto" ? "feito" : "quero", i.date, i.where, i.rating, i.ra, i.rb, i.lbRating, i.director, i.genre, i.orig, i.tm ? i.tm.runtime : "", i.tm ? i.tm.cert : "", i.tm ? i.tm.vote : "", i.tm ? i.tm.overview : "", i.cuisine, i.price, i.dishes, i.notes, i.etype, i.city, i.artists, i.dateEnd, i.cost, i.ticket, i.hl, (i.rewatches || []).map(r => r.date).filter(Boolean).join("; ")].map(q).join(","));
  offerDownload(`nos-dois-${todayStr()}.csv`, "\uFEFF" + [cols.map(q).join(","), ...lines].join("\r\n"));
}
async function restoreBackup(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== "nos-dois" || !Array.isArray(j.items)) throw new Error("Arquivo inválido");
    if (!(await askConfirm(`Isso substitui tudo o que está neste aparelho por ${j.items.length} registros do backup.`, "Restaurar"))) return;
    S = { v: 1, names: j.names || ["Eu", "Ela"], items: j.items, theme: "caldeirao", catalogV: 1 };
    IMG_KEYS.clear(); ATT_KEYS.clear(); mediaCacheClear(); syReset();
    await dbWrite("img", s => s.clear());
    Object.entries(j.imgs || {}).forEach(([id, d]) => setImg(id, d, true));
    Object.entries(j.atts || {}).forEach(([id, d]) => attSave(id, d));
    save(); applyTheme(); toast("Backup restaurado");
  } catch (e) { toast("Não consegui ler esse backup"); }
}

/* ---------- editor ---------- */
let ED = null;
const WHERE_F = ["Cinema", "Em casa", "Netflix", "Prime Video", "Max", "Disney+", "Apple TV+", "Mubi", "Globoplay", "Telecine", "Paramount+"];
function rateHTML(key, label, val, big) {
  return `<div class="rate ${big ? "big" : ""}" data-key="${key}" ${val != null ? 'data-set="1"' : ""}><div class="rate-top"><span>${label}</span><b class="rv">${val != null ? fmt(val) : "—"}</b><button type="button" class="link" data-act="clr">limpar</button></div><input type="range" min="0" max="10" step="0.5" value="${val != null ? val : 7}" aria-label="${esc(label)}"></div>`;
}
function coupleHTML(it) {
  const val = coupleAvg(it.ra, it.rb) ?? (it.ra == null && it.rb == null ? it.rating : null);
  const hint = it.ra == null && it.rb == null && it.rating != null ? "nota anterior; ao avaliar, vira a média" : "média das duas notas";
  return `<div class="rate big" data-key="rating" ${it.rating != null && it.ra == null && it.rb == null ? `data-legacy="${it.rating}"` : ""}><div class="rate-top"><span>Nota de vocês dois <small class="muted" id="rhint">· ${hint}</small></span><b class="rv">${val != null ? fmt(val) : "—"}</b></div></div>`;
}
function updCouple() {
  const g = k => { const r = document.querySelector(`.rate[data-key="${k}"]`); return r && r.dataset.set ? parseFloat(r.querySelector("input").value) : null; };
  const c = document.querySelector('.rate[data-key="rating"]'); if (!c) return;
  const a = g("ra"), b = g("rb"), m = coupleAvg(a, b);
  const val = m ?? (a == null && b == null && c.dataset.legacy ? parseFloat(c.dataset.legacy) : null);
  c.querySelector(".rv").textContent = val != null ? fmt(val) : "—";
  const h = $("#rhint"); if (h) h.textContent = "· " + (m != null ? "média das duas notas" : a == null && b == null ? (c.dataset.legacy ? "nota anterior; ao avaliar, vira a média" : "avaliem os dois") : `falta a nota de ${a == null ? S.names[0] : S.names[1]}`);
}
function openEditor(id, kind, opts = {}) {
  const ex = id ? S.items.find(i => i.id === id) : null;
  const it = ex ? { ...ex, tags: [...(ex.tags || [])], rewatches: (ex.rewatches || []).map(r => ({ ...r })) } : newItem(kind, { status: opts.status || "visto", title: opts.title || "", date: opts.date || "", ...(kind === "show" ? { etype: "Show" } : {}) });
  if (opts.status && ex) { it.status = opts.status; if (opts.status === "visto" && (!it.date || it.date > todayStr())) it.date = todayStr(); }
  OSMF = null;
  const cachedUrl = ex && hasImg(ex.id) ? getImgUrl(ex.id) : null;
  ED = { id: ex ? ex.id : null, it, photo: undefined, preview: cachedUrl || null, _rev: false, isNew: !ex, focus: opts.focus };
  drawEditor();
  if (ex && hasImg(ex.id) && !cachedUrl) {
    getImgUrlAsync(ex.id).then(url => {
      if (ED && ED.id === ex.id && ED.photo === undefined && url) {
        ED.preview = url;
        const pv = $("#pv"); if (pv) pv.innerHTML = `<img src="${url}" alt="">`;
      }
    });
  }
}
function showFields(it) {
  return `<div class="row2"><div class="fld"><label class="f" for="f_etype">Tipo</label><select id="f_etype">${ETYPES.map(t => `<option ${it.etype === t ? "selected" : ""}>${t}</option>`).join("")}</select></div><div class="fld"><label class="f" for="f_city">Cidade</label><input type="text" id="f_city" value="${esc(it.city || "")}" placeholder="Curitiba"></div></div>
  <div class="fld"><label class="f" for="f_artists">Line-up / artistas</label><textarea id="f_artists" rows="2" placeholder="Quem tocou ou vai tocar (separe por vírgula)">${esc(it.artists || "")}</textarea></div>`;
}
function drawEditor() {
  const it = ED.it, isF = it.kind === "filme", isS = it.kind === "show", isR = !isF && !isS, v = it.status === "visto";
  const wh = [...new Set(S.items.filter(i => i.kind === it.kind && i.where).map(i => i.where))];
  const whereOpts = [...new Set([...(isF ? WHERE_F : []), ...wh])];
  const pv = ED.preview ? `<img src="${ED.preview}" alt="">` : "";
  const m = $("#modal");
  m.innerHTML = `<form class="sheet" id="f" autocomplete="off" onsubmit="return false">
  <div class="m-head"><h2>${ED.isNew ? (isF ? "Novo filme" : isS ? "Novo evento" : "Novo restaurante") : "Editar"}</h2><div style="display:flex;gap:6px;align-items:center">${!ED.isNew ? `<button type="button" class="btn sm" data-act="sharecard" data-id="${it.id}" title="Compartilhar card">${ico("share", 15)} Card</button>` : ""}${it.date ? `<button type="button" class="btn sm" data-act="ics" data-id="${it.id}" title="Adicionar ao calendário">${ico("cal", 15)} .ics</button>` : ""}<button type="button" class="x" data-act="close" aria-label="Fechar">✕</button></div></div>
  ${ED.isNew ? `<div class="kseg"><button type="button" class="chip" data-act="setkind" data-kind="filme" aria-pressed="${isF}">Filme</button><button type="button" class="chip" data-act="setkind" data-kind="rest" aria-pressed="${isR}">Restaurante</button><button type="button" class="chip" data-act="setkind" data-kind="show" aria-pressed="${isS}">Evento</button></div>` : ""}
  <div class="photo ${isR ? "restp" : ""}"><div class="pv" id="pv">${pv || `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted)">${ico(kIcon(it.kind), 30)}</span>`}</div><div class="pa"><button type="button" class="btn sm" data-act="pick" data-in="fPh">${ED.preview ? "Trocar foto" : isF ? "Adicionar pôster" : isS ? "Adicionar cartaz ou foto" : "Adicionar foto"}</button>${isR && it.osm && it.osm.lat != null ? `<button type="button" class="btn sm" data-act="osmphoto">${ico("map", 15)} Buscar foto</button>` : ""}${ED.preview ? '<button type="button" class="link" data-act="rmphoto">remover imagem</button>' : ""}<input type="file" id="fPh" accept="image/*" hidden></div></div>
  <div class="fld"><label class="f" for="f_title">${isF ? "Título" : isS ? "Nome do evento" : "Nome do restaurante"}</label><input type="text" id="f_title" value="${esc(it.title)}" ${isR && ED.isNew ? 'list="dl-pl" autocomplete="off"' : ""}>${isR && ED.isNew ? `<datalist id="dl-pl">${[...places().values()].slice(0, 1500).map(p => `<option value="${esc(p.title)}" label="${esc(p.where || "")}">`).join("")}</datalist>` : ""}</div>
  ${isR ? `<div id="osmFind" style="margin:-4px 0 14px">${osmFindInner("ed")}</div>` : ""}
  ${isR && ED.filled ? `<p class="hintp ok">${esc(ED.filled)}</p>` : isR && ED.isNew ? '<p class="hintp">Já foram a este restaurante? Digite o nome e escolha na lista: cozinha, preço, bairro e horário vêm preenchidos.</p>' : ""}
  ${isF ? `<div class="fld" style="margin-top:-6px"><button type="button" class="btn sm" data-act="tmone">${ico("search", 15)} Preencher pelo TMDB</button></div>` : ""}
  ${isS ? showFields(it) : `<div class="row2"><div class="fld">${isF ? `<label class="f" for="f_year">Ano de lançamento</label><input type="text" id="f_year" inputmode="numeric" maxlength="4" value="${esc(it.year)}">` : `<label class="f" for="f_cuisine">Cozinha</label>${cuisineSel(it.cuisine)}`}</div>
  <div class="fld">${isF ? `<label class="f" for="f_director">Diretor(a)</label><input type="text" id="f_director" value="${esc(it.director)}">` : `<label class="f" for="f_price">Faixa de preço</label><select id="f_price">${["", "R$", "R$$", "R$$$", "R$$$$"].map(p => `<option value="${p}" ${it.price === p ? "selected" : ""}>${p || "—"}</option>`).join("")}</select>`}</div></div>`}
  ${isF ? `<div class="fld"><label class="f" for="f_genre">Gênero</label><input type="text" id="f_genre" list="dl-g" placeholder="Drama, Romance" value="${esc(it.genre)}"><datalist id="dl-g">${GENRES.map(g => `<option value="${g}">`).join("")}</datalist></div><div class="fld"><label class="f" for="f_orig">Título original</label><input type="text" id="f_orig" value="${esc(it.orig)}"></div>` : ""}
  ${isR ? `<div class="fld"><label class="f" for="f_hr">Horário de funcionamento</label><input type="text" id="f_hr" value="${esc(it.hr || (it.osm && it.osm.hr) || "")}" placeholder="Seg-Sex 11:00-15:00, 18:00-23:00; Sáb-Dom 12:00-23:00"><p class="hintp" id="hrHint" style="margin:6px 0 0"></p></div>` : ""}
  ${isR ? osmInfoHTML(it) : ""}
  <div class="kseg" style="margin-bottom:14px"><button type="button" class="chip" data-act="setst" data-st="visto" aria-pressed="${v}">${isF ? "Já assistimos" : "Já fomos"}</button><button type="button" class="chip" data-act="setst" data-st="quero" aria-pressed="${isF ? (!v && isWant(it)) : !v}">${isF ? "Queremos ver" : isS ? "Queremos ir" : "Quero ir"}</button></div>
  <div class="row2"><div class="fld"><label class="f" for="f_date" id="l_date">${isS ? "Data (ou primeiro dia)" : v ? (isF ? "Quando assistimos" : "Quando fomos") : "Programado para"}</label><input type="date" id="f_date" value="${esc(it.date)}"></div>
  <div class="fld"><label class="f" for="f_where" id="l_where">${isF ? (v ? "Onde assistimos" : "Onde vamos assistir") : isS ? "Local / casa de show" : "Bairro / cidade"}</label><input type="text" id="f_where" list="dl-w" value="${esc(it.where)}"><datalist id="dl-w">${whereOpts.map(c => `<option value="${esc(c)}">`).join("")}</datalist></div></div>
  ${isS ? `<div class="row2"><div class="fld"><label class="f" for="f_dateEnd">Até (último dia, se durar mais de um)</label><input type="date" id="f_dateEnd" value="${esc(it.dateEnd || "")}"></div><div class="fld"><label class="f" for="f_cost">${v ? "Quanto gastamos (R$)" : "Valor previsto (R$)"}</label><input type="text" id="f_cost" inputmode="decimal" placeholder="ex.: 650" value="${esc(it.cost || "")}"></div></div>${v ? "" : `<div class="fld"><label class="f" for="f_ticket">Ingresso</label><select id="f_ticket">${[["", "—"], ["comprado", "Já temos"], ["pendente", "Falta comprar"]].map(o => `<option value="${o[0]}" ${(it.ticket || "") === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></div>`}` : ""}
  ${isS ? attFields(it) : ""}
  <div id="vistoOnly" ${v ? "" : "hidden"}>
    ${coupleHTML(it)}
    <div class="row2">${rateHTML("ra", esc(S.names[0]), it.ra)}${rateHTML("rb", esc(S.names[1]), it.rb)}</div>
    ${isR ? `<div class="fld"><label class="f" for="f_dishes">Pratos que amamos</label><input type="text" id="f_dishes" value="${esc(it.dishes)}"></div>` : ""}${isS ? `<div class="fld"><label class="f" for="f_hl">Melhor momento</label><input type="text" id="f_hl" value="${esc(it.hl || "")}" placeholder="aquele pôr do sol no palco 2…"></div>` : ""}
    ${isF && !ED.isNew ? rewatchesHTML(it) : ""}
  </div>
  <div class="fld"><label class="f" for="f_notes">Comentários</label><textarea id="f_notes">${esc(it.notes)}</textarea></div>
  ${it.lbRank ? `<p class="lbnote">Letterboxd, Top 250 dos anos ${esc(it.lbDecade)}: <b>#${it.lbRank}</b></p>` : ""}${it.lbRating || safeUrl(it.lbUri) ? `<p class="lbnote">${it.lbRating ? "Sua nota no Letterboxd: <b>★ " + fmt(it.lbRating) + "</b>" : ""}${safeUrl(it.lbUri) ? ` · <a href="${esc(safeUrl(it.lbUri))}" target="_blank" rel="noopener">abrir no Letterboxd</a>` : ""}</p>` : ""}
  ${it.tm ? `<details class="fichad" open><summary>Ficha do TMDB</summary>${fichaHTML(it.tm, it, true)}<p class="attr">Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p></details>` : ""}
  <div class="acts">${ED.isNew ? "" : '<button type="button" class="btn danger" data-act="del">Excluir</button>'}${isR && !ED.isNew ? `<button type="button" class="btn" data-act="newvisit" data-key="${esc(plKey(it))}">Nova visita</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button type="button" class="btn primary" data-act="save">Guardar</button></div></form>`;
  saveFocus(m);
  m.hidden = false; document.body.style.overflow = "hidden";
  hrHint();
  if (ED.focus === "date") setTimeout(() => $("#f_date")?.focus(), 50);
  else if (ED.isNew) setTimeout(() => $("#f_title")?.focus(), 50);
  else setTimeout(() => m.querySelector('[data-act="close"]')?.focus(), 50);
}
function hrHint() {
  const e = $("#hrHint"), i = $("#f_hr"); if (!e || !i) return; const v = i.value.trim();
  if (!v) { e.textContent = "Opcional. Com o horário, as Sugestões sabem se está aberto agora."; return; }
  const o = ohState(v); e.textContent = o.known ? `Agora: ${o.open ? "aberto até " + o.until : "fechado"} · hoje ${o.today}` : "Não entendi esse formato. Exemplo: Seg-Sex 11:00-15:00, 18:00-23:00; Sáb 12:00-23:00";
}
function readForm() {
  const it = ED.it, g = id => { const e = $("#" + id); return e ? e.value.trim() : ""; };
  it.title = g("f_title"); it.date = g("f_date"); it.where = g("f_where"); it.notes = g("f_notes");
  if (it.kind === "filme") { it.year = g("f_year").replace(/\D/g, ""); it.director = g("f_director"); it.genre = g("f_genre"); it.orig = g("f_orig"); } else if (it.kind === "show") { it.etype = g("f_etype") || "Show"; it.city = g("f_city"); it.artists = g("f_artists"); it.dateEnd = g("f_dateEnd"); if (it.dateEnd && (!it.date || it.dateEnd <= it.date)) it.dateEnd = ""; it.cost = g("f_cost"); it.ticket = $("#f_ticket") ? g("f_ticket") : (it.ticket || ""); it.hl = g("f_hl"); } else { it.cuisine = g("f_cuisine"); it.price = g("f_price"); it.dishes = g("f_dishes"); it.hr = g("f_hr"); }
  ["ra", "rb"].forEach(k => { const r = document.querySelector(`.rate[data-key="${k}"]`); if (r) it[k] = r.dataset.set ? parseFloat(r.querySelector("input").value) : null; });
  const cm = coupleAvg(it.ra, it.rb);
  if (cm != null) it.rating = cm; else if (it.ra != null || it.rb != null) it.rating = null; /* só um avaliou: ainda falta a média */
  return it;
}
function closeModal() {
  const m = $("#modal");
  if (ED && ED._rev && ED.preview && ED.preview.startsWith("blob:")) try { URL.revokeObjectURL(ED.preview); } catch (e) { }
  m.hidden = true; document.body.style.overflow = ""; ED = null; attGC(); restoreFocus(m);
}
function saveEditor() {
  const it = readForm();
  if (!it.title) { toast("Dê um nome ao registro"); $("#f_title").focus(); return; }
  if (it.status === "quero") { it.rating = null; it.ra = null; it.rb = null; if (it.kind === "filme" && (it.date || ED.isNew)) it.want = true; }
  it.edited = true;
  const dirtyIds = [it.id];
  const prev = ED.id ? S.items.find(x => x.id === ED.id) : null, oldKey = prev && prev.kind === "rest" ? plKey(prev) : null;
  if (ED.isNew) S.items.push(it); else { const k = S.items.findIndex(x => x.id === ED.id); S.items[k] = it; }
  if (it.kind === "rest") { /* o restaurante é um só: cozinha, preço e horário valem para todas as visitas */
    const nk = plKey(it);
    for (const o of S.items) { if (o.kind !== "rest" || o.id === it.id) continue; const k = plKey(o); if (k !== nk && k !== oldKey) continue;
      const ch = { cuisine: it.cuisine, price: it.price, hr: it.hr || "" }; if (k === oldKey) { ch.title = it.title; ch.where = it.where; }
      let d = false; for (const f in ch) if ((o[f] || "") !== (ch[f] || "")) { o[f] = ch[f]; d = true; } if (d) { o.edited = true; dirtyIds.push(o.id); } }
  }
  if (ED.photo instanceof Blob || typeof ED.photo === "string") setImg(it.id, ED.photo);
  else if (ED.photo === null && hasImg(it.id)) delImg(it.id);
  save(dirtyIds); closeModal(); render(); toast("Guardado");
}
