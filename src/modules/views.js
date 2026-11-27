/* ---------- componentes & telas ---------- */
function eventDayPanel() {
  const today = todayStr(), lim = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return isoDate(d); })();
  const l = S.items.filter(i => i.kind === "show" && i.status === "quero" && i.date && i.date <= lim && (i.dateEnd || i.date) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  return l.map(i => {
    const n = dayDiff(i.date), when = n > 0 ? `em ${n} ${n === 1 ? "dia" : "dias"}` : n === 0 ? "hoje" : "acontecendo agora", tk = attMeta(i, "ticket"), lu = attMeta(i, "lineup");
    const btn = (t, arr, lab) => arr.length ? `<button class="btn primary" data-act="attopen" data-id="${i.id}" data-t="${t}">${ico(t === "ticket" ? "ticket" : "img", 18)} ${lab}${arr.length > 1 ? " (" + arr.length + ")" : ""}</button>` : "";
    return `<div class="panel cta evd"><div><p class="eyebrow">${esc(i.etype || "Evento")} · ${when}</p><h3>${esc(i.title)}</h3><p class="muted">${esc([fmtRange(i), i.where].filter(Boolean).join(" · "))}${tk.length ? "" : " · sem ingresso anexado"}</p></div><div class="btnrow">${btn("ticket", tk, "Ingressos")}${btn("lineup", lu, "Line-up")}<button class="btn" data-act="ics" data-id="${i.id}" title="Adicionar ao calendário">${ico("cal", 16)} .ics</button><button class="btn" data-act="open" data-id="${i.id}">Ficha</button></div></div>`;
  }).join("");
}

function phHTML(i, cls = "poster") {
  const g = CUR.gr[hash(i.title + i.kind) % CUR.gr.length];
  const ini = (i.title || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return `<div class="${cls} ph" style="background:linear-gradient(145deg,${g[0]},${g[1]})">${ico(kIcon(i.kind), 120)}${esc(ini)}</div>`;
}
function card(i) {
  const media = hasImg(i.id) ? imgTag(i.id, "poster") : phHTML(i);
  const rwN = i.kind === "filme" && (i.rewatches || []).length ? i.rewatches.length : 0;
  const lb = i.kind === "show"
    ? [i.etype, attMeta(i, "ticket").length ? "ingresso" : "", attMeta(i, "lineup").length ? "line-up" : ""].filter(Boolean).map((x, k) => `<span class="lbchip" style="top:${8 + k * 26}px">${esc(x)}</span>`).join("")
    : i.kind === "rest"
      ? ((plCounts().get(plKey(i)) || 0) > 1 ? `<span class="lbchip">${plCounts().get(plKey(i))} visitas</span>` : "")
      : [rwN ? `↻ ${rwN + 1}x` : "", i.lbRating ? `★ ${fmt(i.lbRating)}` : (i.lbRank ? `#${i.lbRank} · ${i.lbDecade}` : "")].filter(Boolean).map((x, k) => `<span class="lbchip" style="top:${8 + k * 26}px">${esc(x)}</span>`).join("");
  const sub = i.kind === "filme" ? [i.year, firstDir(i.director)].filter(Boolean).join(" · ") : i.kind === "show" ? [i.where, i.city].filter(Boolean).join(" · ") : [i.cuisine, i.where].filter(Boolean).join(" · ");
  const gen = i.kind === "filme" && i.genre ? i.genre.split(",").slice(0, 2).map(x => x.trim()).join(" · ") : "";
  const cdn = i.kind === "show" && i.date && i.status === "quero" ? (() => { const n = dayDiff(i.date); return n > 0 ? "em " + n + (n === 1 ? " dia" : " dias") : n === 0 ? "é hoje!" : (i.dateEnd && i.dateEnd >= todayStr() ? "acontecendo" : "já passou"); })() : "";
  const dt = i.kind === "show" ? [i.date ? fmtRange(i) : (i.status === "quero" ? "Sem data" : ""), cdn, i.status === "quero" ? ticketTxt(i.ticket) : ""].filter(Boolean).join(" · ") : i.date ? (i.status === "quero" ? "Programado · " : "") + fmtDate(i.date) + (i.kind === "filme" && i.where ? " · " + i.where : "") : (i.status === "visto" ? gen : (gen || "Na fila"));
  return `<div class="card k-${kc(i)}" role="button" tabindex="0" data-act="open" data-id="${i.id}">${media}${badgeHTML(i)}${lb}<div class="cap"><b>${esc(i.title)}</b><small>${esc(sub)}</small><small>${esc(dt)}</small></div></div>`;
}
function sortItems(list, mode, st) {
  const t = (a, b) => a.title.localeCompare(b.title, "pt-BR");
  const cmp = {
    recent: (a, b) => st === "quero" ? ((a.date || "9999").localeCompare(b.date || "9999") || t(a, b)) : ((b.date || "").localeCompare(a.date || "") || t(a, b)),
    rating: (a, b) => ((b.rating ?? -1) - (a.rating ?? -1)) || ((b.lbRating ?? -1) - (a.lbRating ?? -1)) || t(a, b),
    title: t,
    year: (a, b) => ((+b.year || 0) - (+a.year || 0)) || t(a, b),
    lb: (a, b) => ((b.lbRating ?? -1) - (a.lbRating ?? -1)) || t(a, b),
    rank: (a, b) => ((a.lbRank || 9999) - (b.lbRank || 9999)) || t(a, b),
    dir: (a, b) => (a.director || "~").localeCompare(b.director || "~", "pt-BR") || t(a, b),
    cost: (a, b) => (costN(b) - costN(a)) || t(a, b)
  }[mode] || t;
  return list.slice().sort(cmp);
}

/* ---------- navegação ---------- */
const NAV = [["home", "Início", "Início", "home"], ["filmes", "Filmes", "Filmes", "film"], ["rest", "Mesa", "Restaurantes", "fork"], ["eventos", "Eventos", "Eventos", "music"], ["agenda", "Agenda", "Agenda", "cal"], ["ajustes", "Ajustes", "Ajustes", "sliders"]];
function renderShell() {
  $("#nav").innerHTML = NAV.map(n => `<button data-act="nav" data-sec="${n[0]}" ${ui.sec === n[0] ? 'aria-current="page"' : ""}>${ico(n[3], 22)}<span>${n[1]}</span></button>`).join("");
  $("#topBrand").innerHTML = brandHTML(CUR, 24);
  $("#side").innerHTML = `<div class="brand">${brandHTML(CUR, 30)}</div><div class="tagl">cinema, mesa &amp; eventos de ${esc(S.names[0])} e ${esc(S.names[1])}</div>` +
    NAV.filter(n => n[0] !== "ajustes").map(n => `<button class="nv" data-act="nav" data-sec="${n[0]}" ${ui.sec === n[0] ? 'aria-current="page"' : ""}>${ico(n[3], 20)}${n[2]}</button>`).join("") +
    `<div class="spacer"></div><button class="nv" data-act="nav" data-sec="ajustes" ${ui.sec === "ajustes" ? 'aria-current="page"' : ""}>${ico("sliders", 20)}Ajustes</button>`;
  $("#topSec").textContent = NAV.find(n => n[0] === ui.sec)[2];
  const fab = $("#fab"); fab.innerHTML = ico("plus", 26); fab.hidden = !["filmes", "rest", "eventos", "agenda"].includes(ui.sec);
}
function go(sec, to) {
  ui.sec = sec;
  document.body.dataset.sec = sec;
  renderShell(); render();
  if (to) { const el = document.getElementById(to); if (el) { el.scrollIntoView(); return; } }
  window.scrollTo(0, 0); { const mv = $("#view"); if (mv) mv.scrollTop = 0; }
}
function render() {
  _plMemo = null;
  const isMap = ui.sec === "rest" && ui.rest.sec === "mapa";
  if (!isMap) unmountRestMap();
  const v = $("#view");
  v.innerHTML = `<div class="wrap">${{ home: viewHome, filmes: () => viewCollection("filme"), rest: () => viewCollection("rest"), eventos: () => viewCollection("show"), agenda: viewAgenda, ajustes: viewAjustes }[ui.sec]()}</div>`;
  if (isMap) mountRestMap();
}

/* ---------- início ---------- */
function viewHome() {
  const its = S.items, films = its.filter(i => i.kind === "filme"), rests = its.filter(i => i.kind === "rest"), shows = its.filter(i => i.kind === "show");
  const fv = films.filter(i => i.status === "visto"), rv = rests.filter(i => i.status === "visto"), sv = shows.filter(i => i.status === "visto");
  const fa = avg(fv.filter(i => i.rating != null).map(i => i.rating)), ra = avg(rv.filter(i => i.rating != null).map(i => i.rating)), sa = avg(sv.filter(i => i.rating != null).map(i => i.rating));
  const hero = `<div class="hero"><div class="hsym">${symbol(CUR.id, 46)}</div><p class="eyebrow">${esc(S.names[0])} &amp; ${esc(S.names[1])}</p><h1>Nossas noites, <em>registradas.</em></h1>${its.length ? `<div class="btns2" style="margin-top:14px"><button class="btn primary" data-act="roulopen0" data-k="all">${ico("dice", 18)} O que vamos fazer hoje?</button><button class="btn" data-act="retro">${ico("spark", 18)} Nosso Ano</button></div>` : ""}</div>`;
  if (!its.length) return hero + `<div class="empty"><h2>Vamos começar o diário de vocês</h2><p class="muted">Importe seus filmes do Letterboxd ou registre o primeiro programa a dois.</p><ol class="steps" style="text-align:left;max-width:440px;margin:18px auto 0"><li>Importe o ZIP (ou os CSVs) exportado do Letterboxd.</li><li>Avaliem juntos cada filme e cada restaurante: nota, onde e quando.</li><li>Programem os próximos na Agenda.</li></ol><div class="acts"><button class="btn primary" data-act="nav" data-sec="ajustes" data-to="sec-imp">Importar do Letterboxd</button><button class="btn" data-act="add">Adicionar manualmente</button></div></div>`;
  const stats = `<div class="stats"><div class="stat film"><div class="n">${fv.length}</div><div class="l">filmes vistos</div></div><div class="stat film"><div class="n">${fa != null ? fa.toFixed(1).replace(".", ",") : "—"}</div><div class="l">nota média dos filmes</div></div><div class="stat food"><div class="n">${rv.length}</div><div class="l">restaurantes visitados</div></div><div class="stat food"><div class="n">${ra != null ? ra.toFixed(1).replace(".", ",") : "—"}</div><div class="l">nota média dos restaurantes</div></div><div class="stat show"><div class="n">${sv.length}</div><div class="l">eventos vividos</div></div><div class="stat show"><div class="n">${sa != null ? sa.toFixed(1).replace(".", ",") : "—"}</div><div class="l">nota média dos eventos</div></div></div>`;
  const today = todayStr();
  const next = its.filter(i => i.status === "quero" && i.date && i.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const toRate = its.filter(i => i.status === "visto" && i.rating == null);
  let panels = "";
  panels += next ? `<div class="panel cta"><div><p class="eyebrow">Próximo programa</p><h2>${esc(next.title)}</h2><p class="muted">${KNAME[next.kind]} · ${toDate(next.date).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}${next.where ? " · " + esc(next.where) : ""}</p></div><div class="btnrow"><button class="btn" data-act="ics" data-id="${next.id}" title="Adicionar ao calendário">${ico("cal", 16)} .ics</button><button class="btn" data-act="open" data-id="${next.id}">Ver detalhes</button></div></div>` :
    `<div class="panel cta"><div><p class="eyebrow">Próximo programa</p><h3>Nada marcado ainda</h3><p class="muted">Programem o próximo filme, jantar ou evento.</p></div><button class="btn primary" data-act="nav" data-sec="agenda">Abrir agenda</button></div>`;
  panels += eventDayPanel();
  if (toRate.length) panels += `<div class="panel cta"><div><p class="eyebrow">Para avaliar a dois</p><h3>${toRate.length} ${toRate.length === 1 ? "registro sem" : "registros sem"} a nota de vocês</h3></div><button class="btn primary" data-act="torate">Avaliar agora</button></div>`;
  const best = k => sortItems(its.filter(i => i.kind === k && i.status === "visto" && i.rating != null), "rating").slice(0, 10);
  const bf = best("filme"), br = best("rest"), bs = best("show");
  const sc = (t, l, sec) => l.length ? `<div class="sechead"><h2>${t}</h2><button class="link" data-act="nav" data-sec="${sec}">ver todos</button></div><div class="scroller">${l.map(card).join("")}</div>` : "";
  const wl = its.filter(isWant), up = sortItems(wl.length ? wl : its.filter(i => i.kind === "filme" && i.status === "quero" && i.src === "catalogo"), "rank").slice(0, 10);
  return hero + stats + panels + sc("Filmes que mais amamos", bf, "filmes") + sc(wl.length ? "Queremos ver" : "Sugestões do catálogo", up, "filmes") + sc("Restaurantes que mais amamos", br, "rest") + sc("Eventos que mais amamos", bs, "eventos");
}

/* ---------- coleções ---------- */
function filtered(kind) {
  const u = ui[KUI[kind]];
  let l = S.items.filter(i => i.kind === kind);
  l = u.st === "geral" ? l : u.st === "visto" ? l.filter(i => i.status === "visto") : u.st === "quero" ? l.filter(i => kind === "filme" ? isWant(i) : i.status === "quero") : l.filter(i => i.status === "visto" && i.rating == null);
  if (u.g) l = l.filter(i => (i.genre || "").split(",").map(x => x.trim()).includes(u.g));
  if (u.dir) { const q = norm(u.dir); l = l.filter(i => norm(i.director || "").includes(q)); }
  if (u.bairro) { const q = norm(u.bairro); l = l.filter(i => norm(i.where || "").includes(q)); }
  if (u.cuis) { const q = norm(u.cuis); l = l.filter(i => norm(i.cuisine || "").includes(q)); }
  if (u.t) l = l.filter(i => i.etype === u.t);
  if (u.y) l = l.filter(i => (i.date || "").slice(0, 4) === u.y);
  if (u.art) { const q = norm(u.art); l = l.filter(i => norm(i.artists || "").includes(q)); }
  if (u.cast) { const q = norm(u.cast); l = l.filter(i => i.tm && (i.tm.cast || []).some(c => norm(c.n).includes(q))); }
  const q = norm(u.q);
  if (q) l = l.filter(i => norm([i.title, i.orig, i.year, i.director, i.genre, i.tm ? (i.tm.cast || []).map(c => c.n).join(" ") + " " + (i.tm.keywords || []).join(" ") : "", i.where, i.cuisine, i.notes, i.dishes, i.artists, i.city, i.etype, i.hl, i.osm ? i.osm.ad + " " + (i.osm.fl || []).join(" ") + " " + i.osm.br : "", (i.tags || []).join(" ")].join(" ")).includes(q));
  return sortItems(l, u.sort, u.st);
}
function listHTML(kind) {
  const u = ui[KUI[kind]], l = filtered(kind), shown = l.slice(0, u.n);
  if (!l.length) {
    const any = S.items.some(i => i.kind === kind);
    if (u.q || u.dir || u.cast || u.g || u.bairro || u.cuis || u.t || u.y || u.art) { const sem = u.cast ? S.items.filter(i => i.kind === "filme" && !i.tm).length : 0; return `<div class="empty"><p class="muted">Nada encontrado com esses filtros.${sem ? ` ${sem} filmes ainda não têm elenco: use Ajustes › Completar o que falta.` : ""}</p></div>`; }
    if (!any) return `<div class="empty"><h2>${kind === "filme" ? "Nenhum filme ainda" : kind === "show" ? "Nenhum evento ainda" : "Nenhum restaurante ainda"}</h2><p class="muted">${kind === "filme" ? "Importem o export do Letterboxd ou adicionem um filme." : kind === "show" ? "Registrem o primeiro festival, rave ou show de vocês, ou programem o próximo." : "Registrem o primeiro restaurante de vocês."}</p><div class="acts">${kind === "filme" ? '<button class="btn primary" data-act="nav" data-sec="ajustes" data-to="sec-imp">Importar do Letterboxd</button>' : ""}${kind === "filme" ? '<button class="btn" data-act="txopen" data-tab="buscar">Explorar no TMDB</button>' : ""}<button class="btn ${kind === "filme" ? "" : "primary"}" data-act="add">Adicionar</button></div></div>`;
    return `<div class="empty"><p class="muted">${u.st === "avaliar" ? "Tudo avaliado por aqui." : kind === "filme" && u.st === "quero" ? `Nada salvo ainda. Em <b>Geral</b>, toquem no marcador ${ico("mark", 14)} na capa do filme para guardá-lo em Queremos ver.` : "Nada nesta lista."}</p></div>`;
  }
  return `<div class="grid ${kind === "rest" ? "rest" : kind === "show" ? "show" : ""}">${shown.map(card).join("")}</div>` +
    (l.length > shown.length ? `<div class="more"><button class="btn" data-act="more" data-k="${kind}">Mostrar mais (${l.length - shown.length})</button></div>` : "");
}
function filmFilters(u) {
  const films = S.items.filter(i => i.kind === "filme");
  const pt = (a, b) => a.localeCompare(b, "pt-BR");
  const dirs = [...new Set(films.flatMap(i => (i.director || "").split(",").map(x => x.trim()).filter(Boolean)))].sort(pt);
  const cast = [...new Set(films.flatMap(i => ((i.tm && i.tm.cast) || []).map(c => c.n)))].sort(pt).slice(0, 2000);
  return `<div class="toolbar" style="margin-top:-6px"><input type="search" list="dl-fdir" data-fdir="1" value="${esc(u.dir)}" placeholder="Filtrar por diretor(a)…" aria-label="Filtrar por diretor" style="flex:1 1 200px;width:auto"><datalist id="dl-fdir">${dirs.map(d => `<option value="${esc(d)}">`).join("")}</datalist><input type="search" list="dl-fcast" data-fcast="1" value="${esc(u.cast)}" placeholder="Filtrar por elenco…" aria-label="Filtrar por elenco" style="flex:1 1 200px;width:auto"><datalist id="dl-fcast">${cast.map(d => `<option value="${esc(d)}">`).join("")}</datalist></div>`;
}
function genreSel(cur) {
  const all = [...new Set(S.items.filter(i => i.kind === "filme").flatMap(i => (i.genre || "").split(",").map(x => x.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return `<select data-genre="1" aria-label="Gênero"><option value="">Todos os gêneros</option>${all.map(g => `<option ${cur === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>`;
}
function showStats() {
  const sh = S.items.filter(i => i.kind === "show"); if (!sh.length) return "";
  const v = sh.filter(i => i.status === "visto"), today = todayStr();
  const a = avg(v.filter(i => i.rating != null).map(i => i.rating)), gasto = v.reduce((t, i) => t + costN(i), 0);
  const nx = sh.filter(i => i.status === "quero" && i.date && (i.dateEnd || i.date) >= today).sort((x, y) => x.date.localeCompare(y.date))[0];
  const nxt = nx ? (() => { const n = dayDiff(nx.date); return n > 0 ? `em ${n} ${n === 1 ? "dia" : "dias"}` : n === 0 ? "hoje" : "acontecendo"; })() : "—";
  return `<div class="stats s4"><div class="stat show"><div class="n">${v.length}</div><div class="l">eventos vividos</div></div><div class="stat show"><div class="n">${a != null ? a.toFixed(1).replace(".", ",") : "—"}</div><div class="l">nota média</div></div><div class="stat show"><div class="n" style="font-size:${gasto >= 10000 ? 22 : 28}px">${gasto ? brl(gasto) : "—"}</div><div class="l">gasto nos eventos</div></div><div class="stat show"><div class="n" style="font-size:22px">${nxt}</div><div class="l">${nx ? esc(nx.title) : "próximo evento"}</div></div></div>`;
}
function showFilters(u) {
  const sh = S.items.filter(i => i.kind === "show"); if (sh.length < 3) return "";
  const pt = (x, y) => x.localeCompare(y, "pt-BR");
  const years = [...new Set(sh.map(i => (i.date || "").slice(0, 4)).filter(Boolean))].sort().reverse();
  const arts = [...new Set(sh.flatMap(i => (i.artists || "").split(/[,;\n]/).map(x => x.trim()).filter(Boolean)))].sort(pt);
  return `<div class="toolbar" style="margin-top:-6px"><select data-stype="1" aria-label="Tipo de evento" style="flex:1 1 130px;width:auto"><option value="">Todos os tipos</option>${ETYPES.map(t => `<option ${u.t === t ? "selected" : ""}>${t}</option>`).join("")}</select><select data-syear="1" aria-label="Ano" style="flex:1 1 110px;width:auto"><option value="">Todos os anos</option>${years.map(y => `<option ${u.y === y ? "selected" : ""}>${y}</option>`).join("")}</select><input type="search" list="dl-sart" data-sart="1" value="${esc(u.art)}" placeholder="Filtrar por artista…" aria-label="Filtrar por artista" style="flex:1 1 200px;width:auto"><datalist id="dl-sart">${arts.map(d => `<option value="${esc(d)}">`).join("")}</datalist></div>`;
}
function restTabs() {
  const u = ui.rest;
  return `<div class="kseg rtabs">${[["lista", "Restaurantes"], ["mapa", "Mapa"], ["ranking", "Ranking"], ["sugestoes", "Sugestões"]].map(x => `<button type="button" class="chip" data-act="rsec" data-s="${x[0]}" aria-pressed="${u.sec === x[0]}">${x[1]}</button>`).join("")}</div>`;
}
function rankingHTML() {
  const k = ui.rk, N = S.names.map(esc);
  let rows;
  if (k.by === "rest") {
    rows = [...places().values()].filter(p => p.avg != null && (!k.cu || p.cuisine === k.cu)).sort((a, b) => b.avg - a.avg || b.rated.length - a.rated.length || (b.last || "").localeCompare(a.last || "")).map(p => ({ id: p.open.id, t: p.title, sub: [p.cuisine, p.where].filter(Boolean).join(" · "), nt: p.avg, n2: `${p.rated.length} ${p.rated.length === 1 ? "visita" : "visitas"}` }));
  } else {
    rows = S.items.filter(i => i.kind === "rest" && i.status === "visto" && i.rating != null && (!k.cu || i.cuisine === k.cu)).sort((a, b) => b.rating - a.rating || (b.date || "").localeCompare(a.date || "")).map(i => ({ id: i.id, t: i.title, sub: [i.cuisine, i.where, i.date ? fmtDate(i.date) : ""].filter(Boolean).join(" · "), nt: i.rating, n2: i.ra != null && i.rb != null ? `${N[0]} ${fmt(i.ra)} · ${N[1]} ${fmt(i.rb)}` : "" }));
  }
  const shown = rows.slice(0, k.n);
  return `<p class="muted" style="margin:0 0 12px">As melhores experiências gastronômicas de ${N[0]} e ${N[1]}, pela nota do casal.</p>
  <div class="sgbar"><select data-rk="by" aria-label="Agrupar"><option value="exp" ${k.by === "exp" ? "selected" : ""}>Por experiência</option><option value="rest" ${k.by === "rest" ? "selected" : ""}>Por restaurante (média)</option></select><select data-rk="cu" aria-label="Cozinha">${cuisineOpts(k.cu, false)}</select></div>
  ${shown.length ? shown.map((r, n) => `<div class="rk ${n < 3 ? "m" + (n + 1) : ""}" role="button" tabindex="0" data-act="open" data-id="${r.id}"><div class="pos">${n + 1}</div><div class="info"><b>${esc(r.t)}</b><small>${esc(r.sub)}</small></div><div class="nt"><b>${fmt(Math.round(r.nt * 10) / 10)}</b><small>${esc(r.n2)}</small></div></div>`).join("") : `<div class="empty"><p class="muted">Ainda não há experiências avaliadas pelos dois${k.cu ? " nesta cozinha" : ""}. Avaliem uma visita para ela aparecer aqui.</p></div>`}
  ${rows.length > shown.length ? `<div class="more"><button class="btn" data-act="rkmore">Mostrar mais (${rows.length - shown.length})</button></div>` : ""}`;
}
function sugRows() {
  const g = ui.sg, re = wantRe(g.q), qn = norm(g.q), maxP = +g.pr || 0;
  let l = [...places().values()];
  if (g.q) l = l.filter(p => { const t = norm([p.cuisine, p.title, p.dishes].join(" ")); return re ? re.test(t) : t.includes(qn); });
  if (g.cu) l = l.filter(p => p.cuisine === g.cu);
  if (g.vis === "ja") l = l.filter(p => p.visits.length); else if (g.vis === "nao") l = l.filter(p => !p.visits.length);
  if (maxP) l = l.filter(p => !priceN(p.price) || priceN(p.price) <= maxP);
  l.forEach(p => { p._o = ohState(p.hours); });
  if (g.oh === "now") l = l.filter(p => !p._o.known || p._o.open); else if (g.oh === "strict") l = l.filter(p => p._o.known && p._o.open);
  const pr = p => priceN(p.price) || 99, ra = p => p.avg == null ? -1 : p.avg, vis = p => p.visits.length;
  const cmp = { rating: (a, b) => ra(b) - ra(a) || pr(a) - pr(b) || vis(b) - vis(a), price: (a, b) => pr(a) - pr(b) || ra(b) - ra(a), value: (a, b) => (ra(b) / (priceN(b.price) || 3)) - (ra(a) / (priceN(a.price) || 3)) || ra(b) - ra(a) }[g.sort] || (() => 0);
  return l.sort((a, b) => cmp(a, b) || a.title.localeCompare(b.title, "pt-BR"));
}
function sugList() {
  const rows = sugRows(), g = ui.sg, shown = rows.slice(0, g.n);
  if (!rows.length) return `<div class="empty"><p class="muted">Nenhum restaurante com esses critérios. Tentem outro horário, outra cozinha ou mais faixas de preço.</p></div>`;
  return `<p class="muted" style="margin:0 0 10px;font-size:13px">${rows.length} ${rows.length === 1 ? "opção" : "opções"}</p>` + shown.map(p => `<div class="sg" role="button" tabindex="0" data-act="open" data-id="${p.open.id}"><div class="info"><b>${esc(p.title)}</b><small>${esc([p.cuisine, p.where, p.price].filter(Boolean).join(" · ") || "sem detalhes")}</small><small>${p.avg != null ? `nota ${fmt(Math.round(p.avg * 10) / 10)} · ${p.rated.length} ${p.rated.length === 1 ? "visita" : "visitas"}` : p.visits.length ? "visitado, sem nota dos dois" : "ainda não fomos"}${p._o && p._o.known ? " · hoje " + esc(p._o.today) : ""}</small></div><div class="side2">${ohPill(p)}<button type="button" class="btn sm" data-act="newvisit" data-key="${esc(p.key)}">Fomos!</button></div></div>`).join("") +
    (rows.length > shown.length ? `<div class="more"><button class="btn" data-act="sgmore">Mostrar mais (${rows.length - shown.length})</button></div>` : "");
}
function suggestHTML() {
  const g = ui.sg;
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px"><p class="muted" style="flex:1;min-width:200px">Escolham a vontade do dia. A lista segue a nota do casal, o preço e o horário de funcionamento.</p><button type="button" class="btn primary sm" data-act="roulopen0" data-k="rest">${ico("dice", 16)} Sortear restaurante</button></div>
  <div class="wantchips">${WANT.map(w => `<button type="button" class="chip" data-act="sgchip" data-w="${w[0]}" aria-pressed="${norm(g.q) === norm(w[0])}">${w[0]}</button>`).join("")}</div>
  <div class="sgbar"><input type="search" id="sgq" data-sgq="1" value="${esc(g.q)}" placeholder="Vontade de… (sushi, pizza, drinks)" aria-label="Vontade de"><select data-sg="cu" aria-label="Cozinha">${cuisineOpts(g.cu, true)}</select></div>
  <div class="sgbar"><select data-sg="oh" aria-label="Horário">${[["now", "Aberto agora*"], ["strict", "Aberto (confirmado)"], ["", "Qualquer horário"]].map(o => `<option value="${o[0]}" ${g.oh === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select><select data-sg="pr" aria-label="Preço máximo">${[["", "Qualquer preço"], ["1", "Até R$"], ["2", "Até R$$"], ["3", "Até R$$$"]].map(o => `<option value="${o[0]}" ${g.pr === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select><select data-sg="vis" aria-label="Já fomos">${[["", "Todos"], ["ja", "Já fomos"], ["nao", "Novidades"]].map(o => `<option value="${o[0]}" ${g.vis === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select><select data-sg="sort" aria-label="Ordenar">${[["rating", "Melhor avaliação"], ["price", "Menor preço"], ["value", "Custo-benefício"]].map(o => `<option value="${o[0]}" ${g.sort === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></div>
  <p class="hintp" style="margin:-2px 0 12px">*inclui restaurantes sem horário cadastrado. Preencham o horário na ficha para a lista saber se está aberto.</p><div id="sgl">${sugList()}</div>`;
}
function viewCollection(kind) {
  const k = KUI[kind], u = ui[k], isF = kind === "filme", isS = kind === "show";
  const all = S.items.filter(i => i.kind === kind);
  const c = { visto: all.filter(i => i.status === "visto").length, quero: all.filter(i => kind === "filme" ? isWant(i) : i.status === "quero").length, avaliar: all.filter(i => i.status === "visto" && i.rating == null).length, geral: all.length };
  if (!u.touched && u.st === "visto" && !c.visto && c.quero) u.st = "quero";
  const chips = isF ? [["quero", "Queremos ver"], ["visto", "Já vimos"], ["geral", "Geral"]] : isS ? [["quero", "Queremos ir"], ["visto", "Já fomos"], ["geral", "Geral"]] : [["visto", "Visitados"], ["quero", "Quero ir"], ["avaliar", "Por avaliar"]];
  const pend = (isF || isS) && c.avaliar ? `<button class="chip" data-act="chip" data-k="${k}" data-st="avaliar" aria-pressed="${u.st === "avaliar"}" title="${isF ? "Já vimos" : "Já fomos"}, mas falta a nota de um dos dois">Por avaliar<b>${c.avaliar}</b></button>` : "";
  const sorts = isF ? [["recent", "Mais recentes"], ["rating", "Nossa nota"], ["lb", "Nota Letterboxd"], ["rank", "Ranking do catálogo"], ["title", "Título A–Z"], ["year", "Ano de lançamento"], ["dir", "Diretor A–Z"]] : isS ? [["recent", "Mais recentes"], ["rating", "Nossa nota"], ["title", "Nome A–Z"], ["cost", "Maior gasto"]] : [["recent", "Mais recentes"], ["rating", "Nossa nota"], ["title", "Nome A–Z"]];
  const sub = `${c.visto} ${isF ? "vistos" : isS ? "vividos" : "visitados"} · ${c.quero} ${isF ? "para ver" : isS ? "para ir" : "na fila"}${c.avaliar ? " · " + c.avaliar + " por avaliar" : ""}`;
  const HEAD = `<div class="head"><div><h1>${isF ? "Filmes" : isS ? "Eventos" : "Restaurantes"}</h1><p class="sub">${sub}</p></div><div class="btnrow">${isF ? `<button class="btn" data-act="txopen" data-tab="buscar">${ico("search", 18)} Explorar no TMDB</button>` : ""}${kind === "rest" ? `<button class="btn" data-act="nav" data-sec="ajustes" data-to="sec-imp-osm">${ico("search", 18)} Importar de Curitiba</button>` : ""}<button class="btn primary desk" data-act="add">${ico("plus", 18)} ${isF ? "Adicionar filme" : isS ? "Adicionar evento" : "Adicionar restaurante"}</button></div></div>`;
  if (kind === "rest" && u.sec !== "lista") {
    const body = u.sec === "mapa" ? restMapHTML() : u.sec === "ranking" ? rankingHTML() : suggestHTML();
    return HEAD + restTabs() + body;
  }
  return HEAD + (kind === "rest" ? restTabs() : "") + `
  ${isS ? eventDayPanel() + showStats() : ""}
  <div class="toolbar"><div class="seg">${chips.map(x => `<button class="chip" data-act="chip" data-k="${k}" data-st="${x[0]}" aria-pressed="${u.st === x[0]}">${x[1]}<b>${c[x[0]]}</b></button>`).join("")}${pend}</div>
  <div class="tb-right"><input type="search" placeholder="Buscar…" value="${esc(u.q)}" data-q="${k}" aria-label="Buscar">${isF ? genreSel(u.g) : ""}<select data-sort="${k}" aria-label="Ordenar">${sorts.map(s => `<option value="${s[0]}" ${u.sort === s[0] ? "selected" : ""}>${s[1]}</option>`).join("")}</select></div></div>
  ${isF ? filmFilters(u) : isS ? showFilters(u) : restFilters(u)}
  <div id="list">${listHTML(kind)}</div>`;
}
function restFilters(u) {
  const rs = S.items.filter(i => i.kind === "rest"), pt = (a, b) => a.localeCompare(b, "pt-BR");
  if (rs.length < 8) return "";
  const bs = [...new Set(rs.map(i => i.where).filter(Boolean))].sort(pt), cs = [...new Set(rs.flatMap(i => (i.cuisine || "").split(",").map(x => x.trim()).filter(Boolean)))].sort(pt);
  return `<div class="toolbar" style="margin-top:-6px"><input type="search" list="dl-rb" data-rbairro="1" value="${esc(u.bairro)}" placeholder="Filtrar por bairro…" aria-label="Filtrar por bairro" style="flex:1 1 200px;width:auto"><datalist id="dl-rb">${bs.map(d => `<option value="${esc(d)}">`).join("")}</datalist><input type="search" list="dl-rc" data-rcuis="1" value="${esc(u.cuis)}" placeholder="Filtrar por cozinha…" aria-label="Filtrar por cozinha" style="flex:1 1 200px;width:auto"><datalist id="dl-rc">${cs.map(d => `<option value="${esc(d)}">`).join("")}</datalist></div>`;
}

/* ---------- agenda ---------- */
function planRow(i, late, done) {
  const d = toDate(i.date);
  const th = hasImg(i.id) ? imgTag(i.id, "thumb") : phHTML(i, "thumb");
  return `<div class="plan k-${kc(i)} ${late ? "late" : ""}" data-act="open" data-id="${i.id}" role="button" tabindex="0"><div class="dt"><b>${pad(d.getDate())}</b><span>${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>${th}<div class="info"><b>${esc(i.title)}</b><small><span class="tag ${i.kind === "rest" ? "rest" : i.kind === "show" ? "show" : ""}">${i.kind === "filme" ? "Filme" : i.kind === "show" ? esc(i.etype || "Evento") : "Mesa"}</span>${late ? "Ficou para outra lua · " : ""}${esc([i.where, i.dateEnd && i.dateEnd > i.date ? "até " + fmtDate(i.dateEnd) : d.toLocaleDateString("pt-BR", { weekday: "short" })].filter(Boolean).join(" · "))}</small></div>${done ? (i.rating != null ? `<span class="tag" style="margin:0">★ ${fmt(i.rating)}</span>` : "") : `<button class="btn sm" data-act="ics" data-id="${i.id}" title="Adicionar ao calendário" aria-label="Adicionar ao calendário">${ico("cal", 15)}</button><button class="btn sm" data-act="concluir" data-id="${i.id}">${ico("check", 15)} ${i.kind === "filme" ? "Vimos" : "Fomos"}</button>`}</div>`;
}
function wishRow(i) {
  const th = hasImg(i.id) ? imgTag(i.id, "thumb") : phHTML(i, "thumb");
  return `<div class="plan k-${kc(i)}" data-act="open" data-id="${i.id}" role="button" tabindex="0">${th}<div class="info"><b>${esc(i.title)}</b><small>${esc([i.kind === "filme" ? i.year : i.kind === "show" ? i.etype : i.cuisine, i.where].filter(Boolean).join(" · ") || "Sem data")}</small></div><button class="btn sm" data-act="agendar" data-id="${i.id}">Agendar</button></div>`;
}
function calHTML() {
  const A = ui.ag, today = todayStr(); if (!A.m) A.m = today.slice(0, 7);
  const [y, m] = A.m.split("-").map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate(), rows = Math.ceil((first.getDay() + dim) / 7);
  const by = {}; S.items.forEach(i => { itemDates(i).forEach(ds => { (by[ds] = by[ds] || []).push(i); }); });
  const wds = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map(w => `<div class="cwd">${w}</div>`).join(""); let cells = "";
  for (let k = 0; k < rows * 7; k++) {
    const d = new Date(y, m - 1, 1 - first.getDay() + k), ds = isoDate(d), out = d.getMonth() !== m - 1;
    const list = (by[ds] || []).slice().sort((a, b) => (a.status === b.status ? 0 : a.status === "visto" ? -1 : 1) || a.title.localeCompare(b.title, "pt-BR"));
    const dots = list.slice(0, 4).map(i => `<i class="cdot ${kcs(i)} ${i.status === "quero" ? "q" : ""}"></i>`).join("");
    const tt = list.slice(0, 2).map(i => `<span class="${kcs(i)} ${i.status === "quero" ? "q" : ""}">${esc(i.title)}</span>`).join("") + (list.length > 2 ? `<em>+${list.length - 2}</em>` : "");
    const lb = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }) + (list.length ? ", " + list.length + (list.length === 1 ? " registro" : " registros") : "");
    cells += `<button type="button" class="cd ${out ? "cdo" : ""} ${ds === today ? "today" : ""}" data-act="agday" data-d="${ds}" aria-pressed="${A.d === ds}" aria-label="${lb}"><b>${d.getDate()}</b><span class="cdots">${dots}</span><span class="ctt">${tt}</span></button>`;
  }
  let det = "";
  if (A.d) {
    const day = (by[A.d] || []).slice().sort((a, b) => (a.status === b.status ? 0 : a.status === "visto" ? -1 : 1)), dd = toDate(A.d);
    det = `<div id="agdet"><h3 class="mon dd" style="margin-top:6px">${dd.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</h3>` +
      (day.length ? day.map(i => planRow(i, i.status === "quero" && A.d < today, i.status === "visto")).join("") : `<p class="muted" style="font-size:14px;margin-bottom:10px">Nada neste dia.</p>`) +
      `<button class="btn sm" data-act="agadd" data-d="${A.d}">${ico("plus", 15)} Programar neste dia</button></div>`;
  }
  return `<div class="cal"><div class="calh"><h3>${first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3><div class="nv"><button class="btn sm" data-act="agnav" data-n="-1" aria-label="Mês anterior">‹</button><button class="btn sm" data-act="agnav" data-n="0">Hoje</button><button class="btn sm" data-act="agnav" data-n="1" aria-label="Próximo mês">›</button></div></div><div class="cgrid">${wds}</div><div class="cgrid dd">${cells}</div>
  <div class="cleg"><span><i></i>Filme</span><span><i class="r"></i>Mesa</span><span><i class="s"></i>Evento</span><span><i class="q"></i>Programado (ainda por vir)</span><span>Cheio = já fomos/vimos</span></div></div>${det}`;
}
function viewAgenda() {
  const today = todayStr(), A = ui.ag;
  const plan = S.items.filter(i => i.status === "quero" && i.date).sort((a, b) => a.date.localeCompare(b.date));
  const late = plan.filter(i => i.date < today), next = plan.filter(i => i.date >= today);
  const wish = S.items.filter(i => i.status === "quero" && !i.date && (i.kind !== "filme" || i.want));
  const groups = {};
  next.forEach(i => (groups[i.date.slice(0, 7)] = groups[i.date.slice(0, 7)] || []).push(i));
  let h = `<div class="agw"><div class="head"><div><h1>Agenda</h1><p class="sub">O que vem por aí, a dois.</p></div><div class="btnrow"><button class="btn" data-act="txopen" data-tab="cartaz">Em cartaz</button><button class="btn primary desk" data-act="add">${ico("plus", 18)} Programar</button></div></div>
  <div class="agbar"><div class="seg"><button class="chip" data-act="agview" data-v="lista" aria-pressed="${A.view !== "cal"}">Lista</button><button class="chip" data-act="agview" data-v="cal" aria-pressed="${A.view === "cal"}">Calendário</button></div></div>`;
  if (A.view === "cal") return h + calHTML() + `</div>`;
  if (late.length) h += `<h3 class="mon">Ficaram para outra lua</h3>` + late.map(i => planRow(i, true)).join("");
  if (next.length) h += Object.keys(groups).sort().map(m => `<h3 class="mon dd">${toDate(m + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3>` + groups[m].map(i => planRow(i)).join("")).join("");
  else if (!late.length) h += `<div class="empty"><h2>Nada programado</h2><p class="muted">Marquem um cinema, uma sessão em casa ou aquele jantar.</p><div class="acts"><button class="btn primary" data-act="add">Programar agora</button></div></div>`;
  const wf = wish.filter(i => i.kind === "filme"), wr = wish.filter(i => i.kind === "rest"), ws = wish.filter(i => i.kind === "show");
  if (wish.length) h += `<div class="sechead"><h2>Lista de desejos</h2><span class="muted" style="font-size:13px">sem data definida</span></div><div class="two"><div>${wf.length ? `<h3 style="margin-bottom:10px">Filmes</h3>` + wf.slice(0, 40).map(wishRow).join("") + (wf.length > 40 ? `<p class="muted" style="font-size:13px">+ ${wf.length - 40} na aba Filmes › Queremos ver</p>` : "") : ""}</div><div>${wr.length ? `<h3 style="margin-bottom:10px">Restaurantes</h3>` + wr.map(wishRow).join("") : ""}${ws.length ? `<h3 style="margin:14px 0 10px">Eventos</h3>` + ws.map(wishRow).join("") : ""}</div></div>`;
  return h + `</div>`;
}

/* ---------- ajustes ---------- */
function viewAjustes() {
  return `<div class="head"><div><h1>Ajustes</h1><p class="sub" id="devInfo" style="font-size:12px">${esc(DEV.info || "")}</p></div></div>
  ${storageOk ? "" : '<div class="warn"><b>Armazenamento indisponível neste modo.</b> O que você registrar pode se perder ao fechar a página. Baixe um backup com frequência.</div>'}
  ${(() => { if (!SY.F && !SY.loading) syLoad(); return syncCard(); })()}
  <div class="card2"><h3>Quem somos</h3><div class="row2" style="margin-top:10px"><div><input type="text" id="nA" aria-label="Seu nome" value="${esc(S.names[0])}"></div><div><input type="text" id="nB" aria-label="Nome dela" value="${esc(S.names[1])}"></div></div></div>
  <div class="card2" id="sec-imp"><h3>Importar do Letterboxd</h3><p class="muted" style="font-size:14px">No Letterboxd: <b>Settings › Data › Export your data</b>. Escolha o arquivo <b>.zip</b> inteiro (ou os CSVs <i>watched, ratings, diary, watchlist, reviews</i>). Pode importar de novo quando quiser: nada é duplicado e as notas de vocês nunca são sobrescritas.</p>
  <div class="btns"><button class="btn primary" data-act="pick" data-in="fLB">Escolher ZIP ou CSVs</button></div><input type="file" id="fLB" accept=".zip,.csv" multiple hidden>${ui.imp ? `<div class="out">${ui.imp}</div>` : ""}</div>
  ${imCard()}
  ${osmCard()}
  <div class="card2"><h3>Catálogo: melhores filmes de 2010 a 2026</h3><p class="muted" style="font-size:14px">${CATALOG_COUNT} filmes do ranking de maior nota média do Letterboxd (Top 250 dos anos 2010 e 2020, posição de out/2026), com título em português, ano de lançamento, diretor e gênero. Entram em “Quero ver”. Os que você já importou do Letterboxd só ganham os dados que faltam.</p>
  <div class="btns"><button class="btn primary" data-act="catalog">Atualizar catálogo</button><button class="btn" data-act="catalogrm">Remover itens do catálogo que não mexi</button></div>${ui.cat ? `<div class="out">${ui.cat}</div>` : ""}</div>
  <div class="card2" id="sec-tmdb"><h3>TMDB: pôsteres, fichas e descoberta</h3><p class="muted" style="font-size:14px">Com uma chave gratuita (themoviedb.org › Configurações › API), o app busca qualquer filme: pôster em português, sinopse, elenco, equipe, duração, classificação, onde assistir no Brasil, trailer e mais. Também mostra o que está em cartaz, sugere filmes parecidos com os que vocês amaram e deixa explorar a filmografia de um diretor ou ator.</p>
  <div class="fld" style="margin-top:12px"><label class="f" for="tkey">Chave da API (v3) ou token (v4)</label><input type="password" id="tkey" autocomplete="off" value="${esc(TMDBKEY)}" placeholder="cole aqui"></div>
  <div class="btns"><button class="btn primary" data-act="txopen" data-tab="buscar">Explorar o TMDB</button><button class="btn" data-act="tmdb">Completar o que falta nos meus filmes</button><button class="btn" data-act="tmdball">Atualizar todos</button></div>${ui.tmdb ? `<div class="out" id="tmdbOut">${ui.tmdb}</div>` : '<div class="out" id="tmdbOut" hidden></div>'}
  <p class="attr">Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Dados de streaming: JustWatch. A chave fica só neste aparelho.</p></div>
  <div class="card2"><h3>Pôsteres e fotos em lote</h3><p class="muted" style="font-size:14px">O export do Letterboxd <b>não traz imagens</b>. Selecione várias imagens de uma vez: o app liga cada uma ao título pelo nome do arquivo (ex.: <i>Parasita (2019).jpg</i> ou <i>Cantina do Zé.png</i>). Também dá para adicionar a foto de cada item ao editá-lo.</p>
  <div class="btns"><button class="btn" data-act="pick" data-in="fPst">Escolher imagens</button></div><input type="file" id="fPst" accept="image/*" multiple hidden>${ui.pst ? `<div class="out">${ui.pst}</div>` : ""}</div>
  <div class="card2"><h3>Backup</h3><p class="muted" style="font-size:14px">O arquivo JSON inclui registros, notas, fotos e o tema escolhido. A planilha CSV serve para abrir no Excel ou Google Planilhas.</p>
  <div class="btns"><button class="btn primary" data-act="backup">Baixar backup (.json)</button><button class="btn" data-act="csv">Exportar planilha (.csv)</button><button class="btn" data-act="pick" data-in="fRs">Restaurar backup</button></div><input type="file" id="fRs" accept=".json" hidden></div>
  <div class="card2"><h3>Zona de perigo</h3><p class="muted" style="font-size:14px">Apaga todos os registros e fotos deste aparelho.</p><div class="btns"><button class="btn danger" style="border:1px solid var(--danger)" data-act="wipe">Apagar tudo</button></div></div>`;
}
