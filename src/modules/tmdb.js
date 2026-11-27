/* ---------- TMDB: busca, descoberta e ficha completa ---------- */
const TMI = "https://image.tmdb.org/t/p/";
const tmCache = new Map();
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const TMGENRES = [["28", "Ação"], ["12", "Aventura"], ["16", "Animação"], ["35", "Comédia"], ["80", "Crime"], ["99", "Documentário"], ["18", "Drama"], ["10751", "Família"], ["14", "Fantasia"], ["36", "História"], ["27", "Terror"], ["10402", "Música"], ["9648", "Mistério"], ["10749", "Romance"], ["878", "Ficção científica"], ["53", "Suspense"], ["10752", "Guerra"], ["37", "Faroeste"]];
const money = n => n ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n) : "";
const dur = m => m ? ((m >= 60 ? Math.floor(m / 60) + "h " : "") + (m % 60 ? (m % 60) + "min" : "")).trim() : "";

async function tmdbGet(path, params = {}, nocache) {
  if (!TMDBKEY) throw new Error("Falta a chave da API do TMDB (Ajustes).");
  const u = new URL("https://api.themoviedb.org/3" + path), o = {};
  const p = { language: "pt-BR", ...params };
  Object.entries(p).forEach(([a, b]) => { if (b !== "" && b != null) u.searchParams.set(a, b); });
  if (TMDBKEY.length > 40) o.headers = { Authorization: "Bearer " + TMDBKEY }; else u.searchParams.set("api_key", TMDBKEY);
  const key = u.pathname + u.search;
  if (!nocache && tmCache.has(key)) return tmCache.get(key);
  const r = await fetch(u.toString(), o);
  if (!r.ok) throw new Error(r.status === 401 ? "chave inválida (401)" : "o TMDB respondeu " + r.status);
  const j = await r.json();
  if (!nocache) { if (tmCache.size > 60) tmCache.delete(tmCache.keys().next().value); tmCache.set(key, j); }
  return j;
}
const tmDetails = id => tmdbGet("/movie/" + id, { append_to_response: "credits,videos,release_dates,watch/providers,keywords,external_ids,images", include_video_language: "pt,en", include_image_language: "pt,en,null" });
function pickPoster(d) {
  const ps = (d.images && d.images.posters) || [];
  const pt = ps.find(p => p.iso_639_1 === "pt");
  return pt ? pt.file_path : (d.poster_path || (ps[0] && ps[0].file_path) || "");
}
function tmShape(d) {
  const cr = d.credits || {}, crew = cr.crew || [];
  const names = jobs => [...new Set(crew.filter(c => jobs.includes(c.job)).map(c => c.name))];
  const rd = ((d.release_dates || {}).results || []).find(r => r.iso_3166_1 === "BR");
  const rds = rd ? rd.release_dates : [];
  const cert = (rds.find(x => x.certification) || {}).certification || "";
  const relBR = ((rds.find(x => x.type === 3) || rds[0] || {}).release_date || "").slice(0, 10);
  const pr = ((d["watch/providers"] || {}).results || {}).BR || {};
  const pn = a => (a || []).map(x => x.provider_name);
  const vids = ((d.videos || {}).results || []).filter(v => v.site === "YouTube");
  const tr = vids.find(v => v.type === "Trailer" && v.iso_639_1 === "pt") || vids.find(v => v.type === "Trailer") || vids[0];
  return {
    id: d.id, overview: d.overview || "", tagline: d.tagline || "", runtime: d.runtime || 0,
    countries: (d.production_countries || []).map(c => c.name), languages: (d.spoken_languages || []).map(l => l.name || l.english_name),
    cert, relBR, release: d.release_date || "", vote: d.vote_average || 0, votes: d.vote_count || 0,
    cast: (cr.cast || []).slice(0, 10).map(c => ({ n: c.name, c: c.character })),
    writers: names(["Screenplay", "Writer", "Story"]).slice(0, 4), dp: names(["Director of Photography"]).slice(0, 2), music: names(["Original Music Composer"]).slice(0, 2),
    trailer: tr ? tr.key : "", prov: { flat: pn(pr.flatrate), rent: pn(pr.rent), buy: pn(pr.buy) },
    collection: d.belongs_to_collection ? d.belongs_to_collection.name : "", imdb: (d.external_ids || {}).imdb_id || d.imdb_id || "",
    budget: d.budget || 0, revenue: d.revenue || 0, homepage: d.homepage || "",
    keywords: (((d.keywords || {}).keywords) || []).slice(0, 12).map(k => k.name), at: new Date().toISOString()
  };
}
function tmApply(it, d) {
  it.tmdbId = d.id; it.tm = tmShape(d);
  const dir = ((d.credits || {}).crew || []).filter(c => c.job === "Director").map(c => c.name).join(", ");
  if (dir && !it.director) it.director = dir;
  if (d.genres && d.genres.length && !it.genre) it.genre = d.genres.map(g => cap(g.name)).join(", ");
  if (!it.orig && d.original_title) it.orig = d.original_title;
  if (!it.year && d.release_date) it.year = d.release_date.slice(0, 4);
  if (!it.edited && d.title && (it.title === it.orig || it.title === d.original_title)) it.title = d.title;
  return it;
}
function tmFind(m) {
  const y = (m.release_date || "").slice(0, 4);
  return S.items.find(i => i.kind === "filme" && (i.tmdbId === m.id || (y && i.year === y && (keyOf(i.orig || i.title, y) === keyOf(m.original_title || m.title || "", y) || keyOf(i.title, y) === keyOf(m.title || "", y))))) || null;
}
async function tmResolve(it) {
  if (it.tmdbId) return it.tmdbId;
  const q = it.orig || it.title;
  let res = (await tmdbGet("/search/movie", { query: q, year: it.year || "", include_adult: "false" })).results || [];
  if (!res.length && it.year) res = (await tmdbGet("/search/movie", { query: q, include_adult: "false" })).results || [];
  const y = parseInt(it.year, 10);
  const m = res.find(r => !y || Math.abs(parseInt((r.release_date || "0").slice(0, 4), 10) - y) <= 1) || res[0];
  return m ? m.id : 0;
}
async function tmPosterData(d) {
  const pp = pickPoster(d); if (!pp) return null;
  try { const blob = await (await fetch(TMI + "w500" + pp)).blob(); return await resizeImage(blob); } catch (e) { return null; }
}
async function tmFetchInto(it, wantPoster) {
  const id = await tmResolve(it); if (!id) return null;
  const d = await tmDetails(id);
  tmApply(it, d);
  return { d, poster: wantPoster ? await tmPosterData(d) : null };
}
async function tmAdd(m, status) {
  const d = await tmDetails(m.id);
  let it = tmFind(d);
  if (!it) { it = newItem("filme", { title: d.title || m.title || "", orig: d.original_title || "", year: (d.release_date || "").slice(0, 4), status, src: "tmdb" }); S.items.push(it); }
  else if (status === "visto" && it.status === "quero") it.status = "visto";
  if (status === "quero" && it.status === "quero") it.want = true;
  if (status === "visto" && !it.date) it.date = todayStr();
  tmApply(it, d);
  if (!hasImg(it.id)) { const p = await tmPosterData(d); if (p) setImg(it.id, p); }
  save(it.id);
  return it;
}

/* ficha completa (usada no editor e no explorador) */
function fichaHTML(t, m, click) {
  const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  const chips = a => (a || []).map(x => click ? `<button type="button" class="pchip" data-act="setwhere" data-v="${esc(x)}">${esc(x)}</button>` : `<span class="pchip">${esc(x)}</span>`).join("");
  const p = t.prov || {};
  const prov = [p.flat && p.flat.length ? `<div><b>Streaming</b><br>${chips(p.flat)}</div>` : "", p.rent && p.rent.length ? `<div><b>Alugar</b><br>${chips(p.rent)}</div>` : "", p.buy && p.buy.length ? `<div><b>Comprar</b><br>${chips(p.buy)}</div>` : ""].join("");
  const hp = safeUrl(t.homepage);
  const links = [t.trailer ? `<a href="https://www.youtube.com/watch?v=${esc(t.trailer)}" target="_blank" rel="noopener">Trailer</a>` : "", t.imdb ? `<a href="https://www.imdb.com/title/${esc(t.imdb)}/" target="_blank" rel="noopener">IMDb</a>` : "", `<a href="https://www.themoviedb.org/movie/${t.id}?language=pt-BR" target="_blank" rel="noopener">TMDB</a>`, hp ? `<a href="${esc(hp)}" target="_blank" rel="noopener">Site oficial</a>` : ""].filter(Boolean).join(" · ");
  const cert = t.cert ? (t.cert === "L" ? "Livre" : t.cert + " anos") : "";
  const meta = [m.year, dur(t.runtime), cert, m.genre || ""].filter(Boolean).join(" · ");
  return `<div class="ficha">${t.tagline ? `<p class="tagl2">“${esc(t.tagline)}”</p>` : ""}${meta ? `<p class="muted" style="font-size:13.5px">${esc(meta)}</p>` : ""}${t.overview ? `<p style="font-size:14.5px;line-height:1.55">${esc(t.overview)}</p>` : ""}
  <dl>${row("Direção", esc(m.director || ""))}${row("Roteiro", esc((t.writers || []).join(", ")))}${row("Fotografia", esc((t.dp || []).join(", ")))}${row("Trilha", esc((t.music || []).join(", ")))}${row("Elenco", esc((t.cast || []).map(c => c.c ? c.n + " (" + c.c + ")" : c.n).join(" · ")))}${row("Países", esc((t.countries || []).join(", ")))}${row("Idiomas", esc((t.languages || []).join(", ")))}${row("No Brasil", t.relBR ? fmtDate(t.relBR) : "")}${row("Coleção", esc(t.collection || ""))}${row("Nota TMDB", t.votes ? "★ " + fmt(Math.round(t.vote * 10) / 10) + " (" + t.votes.toLocaleString("pt-BR") + " votos)" : "")}${row("Orçamento", money(t.budget))}${row("Bilheteria", money(t.revenue))}${row("Palavras-chave", esc((t.keywords || []).join(", ")))}${row("Links", links)}</dl>
  ${prov ? `<div><p class="eyebrow" style="margin-bottom:6px">Onde assistir no Brasil</p>${prov}<p class="attr" style="margin-top:4px">Dados de streaming: JustWatch.</p></div>` : ""}</div>`;
}

/* explorador: busca, em cartaz, em breve, em alta, melhores, para vocês, descobrir, pessoas */
let TX = null, txT = null;
const TXTABS = [["buscar", "Buscar"], ["cartaz", "Em cartaz"], ["breve", "Em breve"], ["alta", "Em alta"], ["top", "Mais bem avaliados"], ["voces", "Para vocês"], ["descobrir", "Descobrir"]];
function openExplorer(tab) {
  if (!TMDBKEY) { toast("Cole a chave do TMDB em Ajustes para explorar"); go("ajustes", "sec-tmdb"); return; }
  TX = { tab: tab || "buscar", mode: "filme", q: "", page: 1, total: 1, items: [], loading: false, err: "", detail: null, person: null, f: { genre: "", from: "", to: "", min: "", sort: "popularity.desc", lang: "", stream: "" } };
  const tmx = $("#tmx");
  saveFocus(tmx);
  tmx.hidden = false; document.body.style.overflow = "hidden";
  drawTX(); txLoad(true);
  setTimeout(() => tmx.querySelector('[data-act="txclose"]')?.focus(), 20);
}
function closeExplorer() { const tmx = $("#tmx"); TX = null; tmx.hidden = true; document.body.style.overflow = $("#modal").hidden ? "" : "hidden"; restoreFocus(tmx); }
function drawTX() {
  if (!TX) return;
  $("#tmx").innerHTML = `<div class="sheet wide"><div class="m-head"><h2>Explorar no TMDB</h2><button type="button" class="x" data-act="txclose" aria-label="Fechar">✕</button></div>
  <div class="seg" style="margin-bottom:14px">${TXTABS.map(t => `<button type="button" class="chip" data-act="txtab" data-tab="${t[0]}" aria-pressed="${TX.tab === t[0]}">${t[1]}</button>`).join("")}</div>
  <div id="txbar"></div><div id="txlist"></div>
  <p class="attr">Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Dados de streaming: JustWatch.</p></div>`;
  drawTXBar(); drawTXList();
}
function drawTXBar() {
  const el = $("#txbar"); if (!el || !TX) return;
  const X = TX, f = X.f;
  const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`;
  if (X.tab === "buscar") el.innerHTML = `<div class="seg" style="margin-bottom:10px"><button type="button" class="chip" data-act="txmode" data-mode="filme" aria-pressed="${X.mode === "filme"}">Filmes</button><button type="button" class="chip" data-act="txmode" data-mode="pessoa" aria-pressed="${X.mode === "pessoa"}">Pessoas (direção e elenco)</button></div><input type="search" data-txq="1" value="${esc(X.q)}" placeholder="${X.mode === "pessoa" ? "Nome de um diretor, atriz, ator…" : "Título do filme…"}" aria-label="Buscar no TMDB" style="margin-bottom:16px">`;
  else if (X.tab === "descobrir") el.innerHTML = `<div class="row2" style="margin-bottom:10px"><div><label class="f" for="tf_g">Gênero</label><select id="tf_g" data-txf="genre">${opt("", "Todos", f.genre)}${TMGENRES.map(g => opt(g[0], g[1], f.genre)).join("")}</select></div><div><label class="f" for="tf_l">Idioma original</label><select id="tf_l" data-txf="lang">${[["", "Qualquer"], ["pt", "Português"], ["en", "Inglês"], ["ja", "Japonês"], ["ko", "Coreano"], ["fr", "Francês"], ["es", "Espanhol"], ["it", "Italiano"], ["de", "Alemão"], ["hi", "Hindi"]].map(o => opt(o[0], o[1], f.lang)).join("")}</select></div></div>
  <div class="row2" style="margin-bottom:10px"><div><label class="f" for="tf_a">Lançado a partir de</label><input type="text" inputmode="numeric" maxlength="4" id="tf_a" data-txf="from" value="${esc(f.from)}" placeholder="2010"></div><div><label class="f" for="tf_b">Até</label><input type="text" inputmode="numeric" maxlength="4" id="tf_b" data-txf="to" value="${esc(f.to)}" placeholder="2026"></div></div>
  <div class="row2" style="margin-bottom:10px"><div><label class="f" for="tf_m">Nota mínima</label><select id="tf_m" data-txf="min">${[["", "Qualquer"], ["6", "6"], ["7", "7"], ["7.5", "7,5"], ["8", "8"]].map(o => opt(o[0], o[1], f.min)).join("")}</select></div><div><label class="f" for="tf_s">Ordenar por</label><select id="tf_s" data-txf="sort">${[["popularity.desc", "Popularidade"], ["vote_average.desc", "Maior nota"], ["primary_release_date.desc", "Mais recentes"], ["revenue.desc", "Maior bilheteria"]].map(o => opt(o[0], o[1], f.sort)).join("")}</select></div></div>
  <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:12px"><input type="checkbox" data-txf="stream" ${f.stream ? "checked" : ""}> Só o que está em streaming no Brasil</label><button type="button" class="btn primary" data-act="txapply" style="margin-bottom:16px">Buscar</button>`;
  else if (X.tab === "voces") el.innerHTML = `<p class="muted" style="font-size:13.5px;margin-bottom:14px">Filmes parecidos com os que vocês avaliaram com nota alta (7,5 ou mais) e que ainda não estão na lista.</p>`;
  else if (X.tab === "cartaz") el.innerHTML = `<p class="muted" style="font-size:13.5px;margin-bottom:14px">Em cartaz nos cinemas do Brasil.</p>`;
  else if (X.tab === "breve") el.innerHTML = `<p class="muted" style="font-size:13.5px;margin-bottom:14px">Próximos lançamentos no Brasil.</p>`;
  else el.innerHTML = "";
}
function txCard(m) {
  const yr = (m.release_date || "").slice(0, 4), have = tmFind(m);
  const bd = have ? (have.status === "visto" ? `<span class="have">Visto</span>` : isWant(have) ? `<span class="have">Na lista</span>` : "") : "";
  const img = m.poster_path ? `<img src="${TMI}w342${m.poster_path}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : "";
  const add = (have && (have.status === "visto" || isWant(have))) ? "" : `<button type="button" class="add" data-act="txadd" data-id="${m.id}" data-st="quero" aria-label="Adicionar a Quero ver">${ico("plus", 18)}</button>`;
  const sub = [yr, m.vote_count ? "★ " + fmt(Math.round(m.vote_average * 10) / 10) : ""].filter(Boolean).join(" · ");
  return `<div class="txc" role="button" tabindex="0" data-act="txdetail" data-id="${m.id}"><div class="pw">${img}${bd}${add}</div><b>${esc(m.title)}</b><small>${esc(sub)}${m._why ? " · como " + esc(m._why) : ""}</small></div>`;
}
function txPersonCard(p) {
  const img = p.profile_path ? `<img src="${TMI}w185${p.profile_path}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : "";
  const dep = p.known_for_department === "Directing" ? "Direção" : p.known_for_department === "Acting" ? "Atuação" : (p.known_for_department || "");
  const known = (p.known_for || []).map(k => k.title || k.name).filter(Boolean).slice(0, 2).join(", ");
  return `<div class="txc" role="button" tabindex="0" data-act="txperson" data-id="${p.id}"><div class="pw">${img}</div><b>${esc(p.name)}</b><small>${esc([dep, known].filter(Boolean).join(" · "))}</small></div>`;
}
function txDetailHTML() {
  const D = TX.detail, back = `<button type="button" class="btn sm" data-act="txback">‹ Voltar</button>`;
  if (D.loading) return back + `<p class="muted" style="margin:18px 0">Carregando a ficha…</p>`;
  if (D.err) return back + `<div class="warn" style="margin-top:12px">${esc(D.err)}</div>`;
  const d = D.d, t = tmShape(d), have = tmFind(d);
  const dir = ((d.credits || {}).crew || []).filter(c => c.job === "Director").map(c => c.name).join(", ");
  const m = { year: (d.release_date || "").slice(0, 4), director: dir, genre: (d.genres || []).map(g => cap(g.name)).join(", ") };
  const pp = pickPoster(d), img = pp ? `<img src="${TMI}w342${pp}" alt="" decoding="async" onerror="this.remove()">` : "";
  const acts = (have && (have.status === "visto" || isWant(have)))
    ? `<p class="muted" style="font-size:13px">Já está na lista (${have.status === "visto" ? "visto" : "queremos ver"}).</p><button type="button" class="btn" data-act="txedit" data-id="${have.id}">Abrir a ficha de vocês</button>`
    : `<button type="button" class="btn primary" data-act="txadd" data-id="${d.id}" data-st="quero">Queremos ver</button><button type="button" class="btn" data-act="txadd" data-id="${d.id}" data-st="visto">Já assistimos</button><button type="button" class="btn" data-act="txadd" data-id="${d.id}" data-st="agendar">Programar</button>`;
  return `${back}<div class="txd"><div class="txp">${img}</div><div class="txi"><h2>${esc(d.title)}</h2>${d.original_title && d.original_title !== d.title ? `<p class="muted" style="font-size:13px">${esc(d.original_title)}</p>` : ""}<div class="btns2">${acts}</div></div></div>${fichaHTML(t, m, false)}`;
}
function drawTXList() {
  const el = $("#txlist"); if (!el || !TX) return;
  const X = TX;
  if (X.detail) { el.innerHTML = txDetailHTML(); return; }
  let h = "";
  if (X.person) h += `<div class="txhead"><button type="button" class="btn sm" data-act="txback">‹ Voltar</button><div><b style="font-family:var(--serif);font-size:20px">${esc(X.person.name)}</b>${X.person.bio ? `<p class="muted" style="font-size:13px;margin-top:4px">${esc(X.person.bio)}</p>` : ""}</div></div>`;
  if (X.err) h += `<div class="warn">${esc(X.err)}</div>`;
  const items = X.person ? X.person.items : X.items, people = X.tab === "buscar" && X.mode === "pessoa" && !X.person;
  if (items.length) h += `<div class="grid tx">${items.map(m => people ? txPersonCard(m) : txCard(m)).join("")}</div>`;
  else if (!X.loading && !X.err) h += `<div class="empty"><p class="muted">${X.tab === "buscar" ? (X.mode === "pessoa" ? "Digite o nome de um diretor ou de um ator para ver os filmes." : "Digite o título de um filme para buscar.") : "Nada por aqui."}</p></div>`;
  if (X.loading) h += `<p class="muted" style="text-align:center;margin:18px 0">Carregando…</p>`;
  else if (!X.person && X.page < X.total && items.length) h += `<div class="more"><button type="button" class="btn" data-act="txmore">Carregar mais</button></div>`;
  el.innerHTML = h;
}
function txDiscover(pg) {
  const f = TX.f, p = { page: pg, sort_by: f.sort, include_adult: "false", "vote_count.gte": f.sort.startsWith("vote_average") ? 500 : 100 };
  if (f.genre) p.with_genres = f.genre;
  if (f.from) p["primary_release_date.gte"] = f.from + "-01-01";
  if (f.to) p["primary_release_date.lte"] = f.to + "-12-31";
  if (f.min) p["vote_average.gte"] = f.min;
  if (f.lang) p.with_original_language = f.lang;
  if (f.stream) { p.watch_region = "BR"; p.with_watch_monetization_types = "flatrate"; }
  return p;
}
async function txRecs() {
  const base = S.items.filter(i => i.kind === "filme" && i.status === "visto" && i.rating != null && i.rating >= 7.5).sort((a, b) => b.rating - a.rating).slice(0, 6);
  if (!base.length) throw new Error("Avalie alguns filmes com nota 7,5 ou mais para eu sugerir parecidos.");
  const score = new Map();
  for (const it of base) {
    if (!it.tmdbId) { try { it.tmdbId = await tmResolve(it); if (it.tmdbId) markDirty(it.id); } catch (e) { } }
    if (!it.tmdbId) continue;
    const rr = await tmdbGet("/movie/" + it.tmdbId + "/recommendations", { page: 1 });
    (rr.results || []).forEach(m => { const e = score.get(m.id) || { m, n: 0, from: [] }; e.n++; e.from.push(it.title); score.set(m.id, e); });
  }
  save();
  const res = [...score.values()].filter(e => !tmFind(e.m)).sort((a, b) => b.n - a.n || b.m.vote_average - a.m.vote_average).slice(0, 40).map(e => ({ ...e.m, _why: e.from.slice(0, 2).join(" e ") }));
  return { results: res, total_pages: 1 };
}
async function txLoad(reset) {
  const X = TX; if (!X) return;
  if (reset) { X.page = 1; X.items = []; X.total = 1; X.err = ""; }
  X.loading = true; drawTXList();
  try {
    let r = null; const pg = X.page;
    switch (X.tab) {
      case "buscar": if (X.q.trim()) r = await tmdbGet(X.mode === "pessoa" ? "/search/person" : "/search/movie", { query: X.q.trim(), page: pg, include_adult: "false" }); break;
      case "cartaz": r = await tmdbGet("/movie/now_playing", { region: "BR", page: pg }); break;
      case "breve": r = await tmdbGet("/movie/upcoming", { region: "BR", page: pg }); break;
      case "alta": r = await tmdbGet("/trending/movie/week", { page: pg }); break;
      case "top": r = await tmdbGet("/movie/top_rated", { page: pg }); break;
      case "voces": r = await txRecs(); break;
      case "descobrir": r = await tmdbGet("/discover/movie", txDiscover(pg)); break;
    }
    if (X !== TX) return;
    if (r) { X.total = r.total_pages || 1; const seen = new Set(X.items.map(m => m.id)); X.items.push(...(r.results || []).filter(m => !seen.has(m.id))); }
  } catch (e) { X.err = e.message || String(e); }
  X.loading = false; if (X === TX) drawTXList();
}
async function txOpenDetail(id) {
  const X = TX; X.detail = { loading: true }; drawTXList();
  try { const d = await tmDetails(id); if (X !== TX) return; X.detail = { d }; } catch (e) { X.detail = { err: e.message || String(e) }; }
  if (X === TX) { drawTXList(); const sh = $("#tmx .sheet"); if (sh) sh.scrollTop = 0; }
}
async function txOpenPerson(id) {
  const X = TX; X.detail = null; X.err = ""; X.person = { name: "Carregando…", bio: "", items: [] }; X.loading = true; drawTXList();
  try {
    const p = await tmdbGet("/person/" + id, { append_to_response: "movie_credits" });
    const mc = p.movie_credits || {}, map = new Map();
    (mc.crew || []).filter(c => c.job === "Director").forEach(c => map.set(c.id, c));
    (mc.cast || []).forEach(c => { if (!map.has(c.id)) map.set(c.id, c); });
    const items = [...map.values()].filter(c => c.release_date && c.vote_count >= 20).sort((a, b) => b.vote_count - a.vote_count).slice(0, 60);
    const bio = p.biography || "";
    X.person = { name: p.name, bio: bio.slice(0, 320) + (bio.length > 320 ? "…" : ""), items };
  } catch (e) { X.err = e.message || String(e); X.person = null; }
  X.loading = false; if (X === TX) drawTXList();
}
async function txAddFlow(id, st, btn) {
  const pool = TX ? (TX.items || []).concat(TX.person ? TX.person.items : []) : [];
  const m = pool.find(x => x.id === id) || (TX && TX.detail && TX.detail.d && TX.detail.d.id === id ? TX.detail.d : { id });
  if (btn) btn.disabled = true;
  try {
    const it = await tmAdd(m, st === "visto" ? "visto" : "quero");
    toast(`“${it.title}” ${st === "visto" ? "registrado" : "em Queremos ver"}`);
    if (st === "visto" || st === "agendar") { closeExplorer(); render(); openEditor(it.id, null, st === "visto" ? { status: "visto" } : { focus: "date" }); return; }
    if (TX) drawTXList();
    render();
  } catch (e) { toast("Não consegui adicionar: " + (e.message || e)); if (btn) btn.disabled = false; }
}
async function tmOne() {
  if (!TMDBKEY) { toast("Cole a chave do TMDB em Ajustes"); return; }
  readForm(); const it = ED.it;
  if (!it.title) { toast("Digite o título primeiro"); return; }
  toast("Buscando no TMDB…");
  try {
    const r = await tmFetchInto(it, !ED.preview);
    if (!r) { toast("Não encontrei esse filme no TMDB"); return; }
    if (r.poster) {
      if (ED._rev && ED.preview && ED.preview.startsWith("blob:")) try { URL.revokeObjectURL(ED.preview); } catch (e) { }
      ED.photo = r.poster; ED.preview = URL.createObjectURL(r.poster); ED._rev = true;
    }
    drawEditor(); toast("Dados do TMDB carregados");
  } catch (e) { toast("TMDB: " + (e.message || e)); }
}

/* importar do TMDB por filtro (gênero, anos, nota...) */
const imOut = h => { ui.im = h; const e = $("#imOut"); if (e) { e.hidden = false; e.innerHTML = h; } };
function imCard() {
  const f = ui.imf, o = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`;
  return `<div class="card2" id="sec-imp-tmdb"><h3>Importar do TMDB por filtro</h3><p class="muted" style="font-size:14px">Escolha gênero e faixa de anos, e o app traz os filmes que combinam, cada um com a ficha completa (sinopse, elenco, equipe, onde assistir no Brasil e pôster em português). Eles entram em “Quero ver”. Precisa da chave do TMDB (cartão abaixo).</p>
  <div class="row2" style="margin-top:12px"><div class="fld"><label class="f" for="im_g">Gênero</label><select id="im_g" data-imf="g">${o("", "Todos", f.g)}${TMGENRES.map(g => o(g[0], g[1], f.g)).join("")}</select></div><div class="fld"><label class="f" for="im_l">Idioma original</label><select id="im_l" data-imf="l">${[["", "Qualquer"], ["pt", "Português"], ["en", "Inglês"], ["ja", "Japonês"], ["ko", "Coreano"], ["fr", "Francês"], ["es", "Espanhol"], ["it", "Italiano"], ["de", "Alemão"], ["hi", "Hindi"]].map(x => o(x[0], x[1], f.l)).join("")}</select></div></div>
  <div class="row2"><div class="fld"><label class="f" for="im_a">Ano inicial</label><input type="text" inputmode="numeric" maxlength="4" id="im_a" data-imf="a" value="${esc(f.a)}"></div><div class="fld"><label class="f" for="im_b">Ano final</label><input type="text" inputmode="numeric" maxlength="4" id="im_b" data-imf="b" value="${esc(f.b)}"></div></div>
  <div class="row2"><div class="fld"><label class="f" for="im_v">Mínimo de votos no TMDB</label><select id="im_v" data-imf="v">${[["50", "50"], ["200", "200"], ["500", "500"], ["1000", "1.000"], ["5000", "5.000"]].map(x => o(x[0], x[1], f.v)).join("")}</select></div><div class="fld"><label class="f" for="im_m">Nota mínima</label><select id="im_m" data-imf="m">${[["", "Qualquer"], ["6", "6"], ["6.5", "6,5"], ["7", "7"], ["7.5", "7,5"], ["8", "8"]].map(x => o(x[0], x[1], f.m)).join("")}</select></div></div>
  <div class="row2"><div class="fld"><label class="f" for="im_n">Quantidade</label><select id="im_n" data-imf="n">${[["100", "Até 100"], ["300", "Até 300"], ["1000", "Até 1.000"], ["all", "Todos (pode demorar)"]].map(x => o(x[0], x[1], f.n)).join("")}</select></div><div class="fld"><label class="f" for="im_s">Ordem</label><select id="im_s" data-imf="s">${[["popularity.desc", "Mais populares"], ["vote_average.desc", "Maior nota"], ["vote_count.desc", "Mais votados"], ["primary_release_date.desc", "Mais recentes"]].map(x => o(x[0], x[1], f.s)).join("")}</select></div></div>
  <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:8px"><input type="checkbox" data-imf="st" ${f.st ? "checked" : ""}> Só o que está em streaming no Brasil</label>
  <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:4px"><input type="checkbox" data-imf="p" ${f.p ? "checked" : ""}> Baixar os pôsteres (ocupa mais espaço no aparelho)</label>
  <div class="btns"><button class="btn" data-act="imcount">Ver quantos filmes</button><button class="btn primary" data-act="imrun">Importar</button><button class="btn" data-act="imcancel">Parar</button><button class="btn danger" style="border:1px solid var(--danger)" data-act="imundo">Desfazer a última importação</button></div>
  <div class="out" id="imOut" ${ui.im ? "" : "hidden"}>${ui.im || ""}</div>
  <p class="attr">Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. O TMDB lista no máximo 10.000 resultados por busca.</p></div>`;
}
function imParams(page) {
  const f = ui.imf, p = { page, sort_by: f.s, include_adult: "false", "vote_count.gte": f.v };
  if (f.g) p.with_genres = f.g;
  if (f.a) p["primary_release_date.gte"] = f.a + "-01-01";
  if (f.b) p["primary_release_date.lte"] = f.b + "-12-31";
  if (f.m) p["vote_average.gte"] = f.m;
  if (f.l) p.with_original_language = f.l;
  if (f.st) { p.watch_region = "BR"; p.with_watch_monetization_types = "flatrate"; }
  return p;
}
async function imCount() {
  if (!TMDBKEY) return imOut("Cole primeiro a chave da API do TMDB (cartão abaixo).");
  try {
    const r = await tmdbGet("/discover/movie", imParams(1), true), n = r.total_results || 0;
    const lim = ui.imf.n === "all" ? n : Math.min(n, parseInt(ui.imf.n, 10));
    imOut(`<b>${n.toLocaleString("pt-BR")}</b> filmes combinam com o filtro. Vão entrar até <b>${lim.toLocaleString("pt-BR")}</b> (os que já estão na lista são pulados). Tempo estimado: ${Math.max(1, Math.ceil(lim / 300))} min.`);
  } catch (e) { imOut("Não consegui consultar o TMDB: " + esc(e.message || e)); }
}
let imBusy = false, imStop = false;
async function imRun() {
  if (!TMDBKEY) return imOut("Cole primeiro a chave da API do TMDB (cartão abaixo).");
  if (imBusy) return;
  imBusy = true; imStop = false;
  const limit = ui.imf.n === "all" ? Infinity : parseInt(ui.imf.n, 10), wantPoster = !!ui.imf.p, batch = "imp-" + Date.now();
  let page = 1, total = 1, skipped = 0, done = 0, fail = 0, posters = 0, idx = 0; const found = [];
  try {
    while (!imStop && page <= Math.min(total, 500) && found.length < limit) {
      const r = await tmdbGet("/discover/movie", imParams(page), true);
      total = r.total_pages || 1;
      for (const m of r.results || []) { if (found.length >= limit) break; if (tmFind(m)) skipped++; else if (!found.some(x => x.id === m.id)) found.push(m); }
      imOut(`Listando… página ${page} de ${Math.min(total, 500)}: ${found.length} novos, ${skipped} já na lista.`);
      page++;
    }
    S.lastImp = batch;
    const worker = async () => {
      while (!imStop) {
        const m = found[idx++]; if (!m) return;
        for (let t = 0; t < 3; t++) {
          try {
            const d = await tmdbGet("/movie/" + m.id, { append_to_response: "credits,videos,release_dates,watch/providers,keywords,external_ids", include_video_language: "pt,en" }, true);
            const it = newItem("filme", { title: d.title || m.title || "", orig: d.original_title || m.original_title || "", year: (d.release_date || m.release_date || "").slice(0, 4), status: "quero", src: "tmdb", imp: batch });
            tmApply(it, d); S.items.push(it);
            const pp = d.poster_path || m.poster_path;
            if (wantPoster && pp) { try { const blob = await (await fetch(TMI + "w342" + pp)).blob(); setImg(it.id, await resizeImage(blob, 520, 0.72), true); posters++; } catch (e) { } }
            done++; break;
          } catch (e) { if (t === 2 || /401/.test(e.message || "")) { fail++; break; } await sleep(1200); }
        }
        if ((done + fail) % 10 === 0) { imOut(`Importando… ${done + fail} de ${found.length} (${done} ok${fail ? ", " + fail + " com erro" : ""}).`); save(); }
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
    save();
    imOut(`<b>${imStop ? "Interrompido" : "Concluído"}.</b> ${done} filmes importados com ficha completa${wantPoster ? `, ${posters} pôsteres` : ""}${skipped ? `, ${skipped} já estavam na lista` : ""}${fail ? `, ${fail} com erro` : ""}.`);
    render();
  } catch (e) { save(); imOut(`Não consegui continuar (${esc(e.message || e)}). Confira a chave e a conexão.${done ? ` Até aqui: ${done} importados.` : ""}`); }
  imBusy = false;
}
async function imUndo() {
  const rm = S.items.filter(i => S.lastImp && i.imp === S.lastImp && !i.edited && i.status === "quero");
  if (!rm.length) return toast("Nada da última importação para desfazer");
  if (!(await askConfirm(`${rm.length} filmes da última importação (que você não alterou) serão removidos.`, "Desfazer"))) return;
  const ids = new Set(rm.map(i => i.id)); rm.forEach(i => delImg(i.id));
  S.items = S.items.filter(i => !ids.has(i.id)); save(); imOut(`${rm.length} filmes removidos.`); render();
}

/* completar vários filmes de uma vez */
let tmdbBusy = false;
async function enrichTMDB(force) {
  const out = h => { ui.tmdb = h; const e = $("#tmdbOut"); if (e) { e.hidden = false; e.innerHTML = h; } };
  if (!TMDBKEY) return out("Cole primeiro a chave da API do TMDB.");
  if (tmdbBusy) return;
  const todo = S.items.filter(i => i.kind === "filme" && (force || !i.tm || !hasImg(i.id) || !i.director || !i.genre));
  if (!todo.length) return out("Todos os filmes já têm a ficha completa. Use “Atualizar tudo” para refazer.");
  tmdbBusy = true; let ok = 0, posters = 0, miss = 0, n = 0;
  try {
    for (const it of todo) {
      n++; out(`Buscando ${n} de ${todo.length}: ${esc(it.title)}…`);
      const r = await tmFetchInto(it, !hasImg(it.id));
      if (!r) { miss++; continue; }
      markDirty(it.id);
      if (r.poster) { setImg(it.id, r.poster); posters++; }
      ok++; if (n % 10 === 0) save();
    }
    save(); out(`<b>Concluído.</b> ${ok} filmes com ficha completa, ${posters} pôsteres em português baixados${miss ? `, ${miss} sem correspondência` : ""}.`); render();
  } catch (e) {
    save();
    out(`Não consegui falar com o TMDB (${esc(e.message || e)}). Confira a chave e a conexão.${ok ? ` Até aqui: ${ok} atualizados.` : ""}`);
  }
  tmdbBusy = false;
}
