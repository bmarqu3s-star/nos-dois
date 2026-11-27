export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export const safeUrl = u => {
  const s = String(u || "").trim();
  if (!s) return "";
  try {
    const parsed = new URL(s);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") ? parsed.href : "";
  } catch (e) {
    return "";
  }
};

export const hash = s => {
  let h = 7;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

export const fmt = n => (n % 1 ? n.toFixed(1) : String(n)).replace(".", ",");
export const pad = n => String(n).padStart(2, "0");
export const isoDate = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const todayStr = () => isoDate(new Date());
export const toDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const fmtDate = s => s ? toDate(s).toLocaleDateString("pt-BR") : "";
export const firstDir = d => d ? d.split(",")[0].trim() + (d.includes(",") ? " e outros" : "") : "";
export const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

export function coupleAvg(ra, rb) {
  return ra != null && rb != null ? Math.round(((ra + rb) / 2) * 100) / 100 : null;
}

export function coupleSync(it) {
  const m = coupleAvg(it.ra, it.rb);
  if (m != null) it.rating = m;
  return it;
}

export const isWant = i => i.kind === "filme" && i.status === "quero" && !!(i.want || i.date);

export const KUI = { filme: "filmes", rest: "rest", show: "shows" };
export const KOF = { filmes: "filme", rest: "rest", shows: "show" };
export const KNAME = { filme: "Filme", rest: "Restaurante", show: "Evento" };
export const kc = i => i.kind === "filme" ? "film" : i.kind === "show" ? "show" : "rest";
export const kcs = i => i.kind === "rest" ? "r" : i.kind === "show" ? "s" : "";
export const kIcon = k => k === "filme" ? "film" : k === "show" ? "music" : "fork";
export const ETYPES = ["Festival", "Rave", "Show", "Balada", "Outro"];

export const costN = i => {
  let s = String(i.cost || "").replace(/[^\d.,]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export const brl = n => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: n % 1 ? 2 : 0 });
export const dayDiff = d => Math.round((toDate(d) - toDate(todayStr())) / 864e5);
export const fmtRange = i => !i.date ? "" : i.dateEnd && i.dateEnd > i.date ? (i.date.slice(0, 7) === i.dateEnd.slice(0, 7) ? pad(toDate(i.date).getDate()) + "–" + fmtDate(i.dateEnd) : fmtDate(i.date) + " – " + fmtDate(i.dateEnd)) : fmtDate(i.date);
export const ticketTxt = t => t === "comprado" ? "ingresso ok" : t === "pendente" ? "falta ingresso" : "";

export const keyOf = (t, y) => norm(t) + "|" + (y || "");
export const stripHtml = s => s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").trim();

export function parseCSV(t) {
  t = String(t || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); f = ""; rows.push(row); row = []; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  if (!rows.length) return [];
  const h = rows.shift().map(x => x.trim().toLowerCase());
  return rows.filter(r => r.some(x => x !== "")).map(r => {
    const o = {};
    h.forEach((k, i) => { o[k] = (r[i] || "").trim(); });
    return o;
  });
}

export const priceN = p => (String(p || "").match(/\$/g) || []).length;

const OH_D = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const OH_PT = { seg: "Mo", segunda: "Mo", ter: "Tu", terca: "Tu", qua: "We", quarta: "We", qui: "Th", quinta: "Th", sex: "Fr", sexta: "Fr", sab: "Sa", sabado: "Sa", dom: "Su", domingo: "Su" };

export function ohNorm(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—]/g, "-");
  s = s.replace(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)\b/gi, m => OH_PT[m.toLowerCase()]);
  s = s.replace(/\bfechado\b/gi, "off").replace(/\b24 ?h(oras)?\b/gi, "00:00-24:00").replace(/\b(\d{1,2})h(\d{2})?\b/gi, (m, h, mi) => pad(+h) + ":" + (mi || "00")).replace(/\bas\b/gi, "-").replace(/\be\b/gi, ",");
  return s.replace(/\s*-\s*/g, "-").replace(/\s*,\s*/g, ",").trim();
}

export function parseOH(raw) {
  let s = ohNorm(raw);
  if (!s) return null;
  if (/^24\/7$/i.test(s)) s = "Mo-Su 00:00-24:00";
  const days = Array(7).fill(null), idx = d => OH_D.indexOf(d);
  let any = false;
  for (let rule of s.split(/;|\n/)) {
    rule = rule.trim();
    if (!rule) continue;
    if (/^PH\b/i.test(rule)) continue;
    if (/PH|SH|sunrise|sunset|week|\[|\+|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(rule)) return null;
    const m = rule.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?)+)?\s*(.*)$/);
    if (!m) return null;
    const dp = (m[1] || "").replace(/,$/, ""), tp = (m[2] || "").trim();
    let set = [];
    if (!dp) set = [0, 1, 2, 3, 4, 5, 6];
    else {
      for (const seg of dp.split(",")) {
        const r = seg.split("-"), a = idx(r[0]);
        if (a < 0) return null;
        if (r.length === 1) set.push(a);
        else {
          const b = idx(r[1]);
          if (b < 0) return null;
          let x = a;
          for (let k = 0; k < 8; k++) { set.push(x); if (x === b) break; x = (x + 1) % 7; }
        }
      }
    }
    const iv = [];
    if (!/^(off|closed)$/i.test(tp)) {
      for (const t of tp.split(",")) {
        const q = t.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
        if (!q) return null;
        const a = +q[1] * 60 + +q[2];
        let b = +q[3] * 60 + +q[4];
        if (b <= a) b += 1440;
        iv.push([a, b]);
      }
    }
    for (const d of set) days[d] = iv;
    any = true;
  }
  return any ? days : null;
}

export function ohState(raw, now = new Date()) {
  const d = parseOH(raw);
  if (!d) return { known: false };
  const dow = now.getDay(), min = now.getHours() * 60 + now.getMinutes();
  const hm = x => x === 1440 ? "24:00" : pad(Math.floor(x / 60) % 24) + ":" + pad(x % 60);
  let open = false, until = null;
  for (const [a, b] of (d[dow] || [])) if (min >= a && min < b) { open = true; until = b; }
  for (const [a, b] of (d[(dow + 6) % 7] || [])) if (b > 1440 && min < b - 1440) { open = true; until = b - 1440; }
  const today = (d[dow] || []), txt = today.length ? today.map(([a, b]) => hm(a) + "–" + hm(b > 1440 ? b - 1440 : b)).join(" e ") : "fechado hoje";
  const nxt = !open && today.find(([a]) => a > min);
  return { known: true, open, until: until != null ? hm(until) : "", today: txt, opens: nxt ? hm(nxt[0]) : "" };
}

export const syHash = str => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
};
export const sigOf = it => syHash(JSON.stringify(it));
export const imgSig = d => d.length + ":" + syHash(d.slice(0, 64) + d.slice(-64));
export const syncable = i => !((i.imp || i.impOsm || i.src === "catalogo") && !i.edited && !i.want && i.status === "quero" && !i.date);
export const idKey = i => i.osm ? "osm|" + i.osm.id : i.kind + "|" + norm(i.title) + "|" + (i.kind === "filme" ? i.year : i.kind === "show" ? i.date : norm(i.where));

export function fillMissing(r, dup) {
  const empty = v => v == null || v === "";
  ["ra", "rb", "rating", "date", "where", "notes", "dishes", "price"].forEach(k => { if (empty(r[k]) && !empty(dup[k])) r[k] = dup[k]; });
  if (dup.status === "visto" && r.status === "quero") r.status = "visto";
  if ((dup.att || []).length) r.att = [...(r.att || []), ...dup.att.filter(x => !(r.att || []).some(y => y.id === x.id))];
  if ((dup.rewatches || []).length) {
    const have = new Set((r.rewatches || []).map(x => (x.date || "") + "|" + (x.where || "")));
    r.rewatches = [...(r.rewatches || []), ...dup.rewatches.filter(x => !have.has((x.date || "") + "|" + (x.where || "")))];
  }
  return coupleSync(r);
}

export const GENRES = ["Ação", "Animação", "Aventura", "Comédia", "Crime", "Drama", "Família", "Fantasia", "Faroeste", "Ficção científica", "Guerra", "História", "Mistério", "Música", "Romance", "Suspense", "Terror"];

export function classifyLB(name, rows, add) {
  const n = String(name || "").toLowerCase(), h = (rows && rows[0]) || {};
  let k = null;
  if (n.includes("watchlist")) k = "watchlist";
  else if (n.includes("diary")) k = "diary";
  else if (n.includes("ratings")) k = "ratings";
  else if (n.includes("reviews")) k = "reviews";
  else if (n.includes("watched")) k = "watched";
  else if ("watched date" in h) k = "diary";
  else if ("review" in h) k = "reviews";
  else if ("rating" in h && "name" in h) k = "ratings";
  if (k && rows && rows.length) add(k, rows);
  return k;
}

export function importLBItems(items, d, makeItem) {
  const idx = new Map();
  items.filter(i => i.kind === "filme").forEach(i => {
    idx.set(keyOf(i.title, i.year), i);
    if (i.orig) idx.set(keyOf(i.orig, i.year), i);
  });
  const touched = new Set();
  let created = 0, wl = 0;
  const get = (r, status) => {
    const title = (r.name || "").trim();
    if (!title) return null;
    const year = (r.year || "").trim(), k = keyOf(title, year);
    let it = idx.get(k);
    if (!it) {
      it = makeItem("filme", { title, year, status, want: status === "quero", src: "letterboxd", orig: title, lbUri: r["letterboxd uri"] || "" });
      items.push(it); idx.set(k, it); created++;
      if (status === "quero") wl++;
    } else {
      touched.add(it.id);
      if (!it.lbUri && r["letterboxd uri"]) it.lbUri = r["letterboxd uri"];
    }
    return it;
  };
  (d.watchlist || []).forEach(r => get(r, "quero"));
  (d.watched || []).forEach(r => { const it = get(r, "visto"); if (it && it.status === "quero") it.status = "visto"; });
  (d.ratings || []).forEach(r => { const it = get(r, "visto"); if (!it) return; if (it.status === "quero") it.status = "visto"; const n = parseFloat(r.rating); if (n) it.lbRating = n; });
  const last = {};
  (d.diary || []).forEach(r => {
    const it = get(r, "visto"); if (!it) return; if (it.status === "quero") it.status = "visto";
    const n = parseFloat(r.rating); if (n) it.lbRating = n;
    const wd = r["watched date"] || r.date;
    if (wd && (!last[it.id] || wd > last[it.id])) last[it.id] = wd;
    if (r.tags) it.tags = [...new Set([...(it.tags || []), ...r.tags.split(/[,;]/).map(x => x.trim()).filter(Boolean)])];
  });
  Object.keys(last).forEach(id => { const it = items.find(x => x.id === id); if (it && (!it.date || !it.edited)) it.date = last[id]; });
  (d.reviews || []).forEach(r => {
    const it = get(r, "visto"); if (!it) return; if (it.status === "quero") it.status = "visto";
    const n = parseFloat(r.rating); if (n && !it.lbRating) it.lbRating = n;
    if (!it.notes && r.review) it.notes = stripHtml(r.review);
  });
  return { created, updated: touched.size, wl, touchedIds: [...touched] };
}

export function mergeSyncItem(items, id, docData, sigMap) {
  const byId = new Map(items.map(i => [i.id, i]));
  const loc = byId.get(id);
  if (docData.del) {
    if (!loc) { delete sigMap[id]; return { changed: false, removedId: null, mergedDupId: null }; }
    const idx = items.indexOf(loc);
    if (idx >= 0) items.splice(idx, 1);
    delete sigMap[id];
    return { changed: true, removedId: id, mergedDupId: null };
  }
  let it;
  try { it = typeof docData.j === "string" ? JSON.parse(docData.j) : docData.j; } catch (e) { return { changed: false, removedId: null, mergedDupId: null }; }
  if (!it || typeof it !== "object") return { changed: false, removedId: null, mergedDupId: null };
  coupleSync(it);
  const s0 = sigOf(it);
  if (loc) {
    if (sigMap[id] === undefined || sigOf(loc) !== sigMap[id]) return { changed: false, removedId: null, mergedDupId: null };
    items[items.indexOf(loc)] = it;
    sigMap[id] = s0;
    return { changed: true, removedId: null, mergedDupId: null, item: it };
  }
  const k = idKey(it);
  const dup = items.find(i => sigMap[i.id] === undefined && idKey(i) === k);
  let mergedDupId = null;
  if (dup) {
    fillMissing(it, dup);
    const di = items.indexOf(dup);
    if (di >= 0) items.splice(di, 1);
    mergedDupId = dup.id;
  }
  items.push(it);
  sigMap[id] = s0;
  return { changed: true, removedId: null, mergedDupId, item: it };
}

export const OSM_CUIS = { pizza: "Pizzaria", italian: "Italiana", pasta: "Italiana", japanese: "Japonesa", sushi: "Japonesa", ramen: "Japonesa", burger: "Hambúrguer", brazilian: "Brasileira", regional: "Brasileira", steak_house: "Churrascaria", barbecue: "Churrascaria", churrasco: "Churrascaria", grill: "Churrascaria", arab: "Árabe", lebanese: "Árabe", kebab: "Árabe", middle_eastern: "Árabe", french: "Francesa", mexican: "Mexicana", coffee_shop: "Café / Padaria", cafe: "Café / Padaria", bakery: "Café / Padaria", vegetarian: "Vegetariana", vegan: "Vegetariana", seafood: "Frutos do mar", fish: "Frutos do mar", ice_cream: "Sorveteria", dessert: "Sobremesas", chinese: "Chinesa", thai: "Tailandesa", german: "Alemã", portuguese: "Portuguesa", spanish: "Espanhola", indian: "Indiana", korean: "Coreana", peruvian: "Peruana", argentinian: "Argentina", sandwich: "Lanches", fast_food: "Fast-food", chicken: "Frango", international: "Internacional", contemporary: "Contemporânea", ukrainian: "Ucraniana", polish: "Polonesa", asian: "Asiática", juice: "Sucos", pub: "Pub", bar: "Bar", diner: "Lanchonete", buffet: "Self-service", pastel: "Pastelaria", crepe: "Crepes", salad: "Saladas", steak: "Carnes", pancake: "Panquecas", tea: "Chá", beer: "Cervejaria" };
export const OSM_DEF = { cafe: "Café / Padaria", fast_food: "Fast-food", bar: "Bar", pub: "Bar", biergarten: "Bar", ice_cream: "Sorveteria", food_court: "Praça de alimentação" };

export function osmCuisine(t) {
  const list = [];
  (t.cuisine || "").split(/[;,]/).map(x => x.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean).forEach(x => {
    const m = OSM_CUIS[x] || (x[0].toUpperCase() + x.slice(1).replace(/_/g, " "));
    if (!list.includes(m)) list.push(m);
  });
  return list.length ? list.slice(0, 2).join(", ") : (OSM_DEF[t.amenity] || "");
}

export function osmFlags(t) {
  const y = k => /^(yes|only|required)$/.test(t[k] || ""), f = [];
  if (y("diet:vegetarian")) f.push("Opção vegetariana");
  if (y("diet:vegan")) f.push("Opção vegana");
  if (y("diet:gluten_free")) f.push("Sem glúten");
  if (y("diet:halal")) f.push("Halal");
  if (y("outdoor_seating")) f.push("Área externa");
  if (y("wheelchair")) f.push("Acessível");
  if (y("delivery")) f.push("Delivery");
  if (y("takeaway")) f.push("Para levar");
  if (y("drive_through")) f.push("Drive-thru");
  if (y("reservation")) f.push("Reserva");
  if (/^(wlan|yes|wifi)$/.test(t.internet_access || "")) f.push("Wi-Fi");
  if (y("air_conditioning")) f.push("Ar-condicionado");
  if (y("live_music") || y("music:live")) f.push("Música ao vivo");
  if (y("payment:credit_cards")) f.push("Cartão");
  if (y("payment:pix")) f.push("Pix");
  if (y("microbrewery") || y("brewery")) f.push("Cervejaria");
  return f;
}

export function osmExtraTags(t) {
  const out = {};
  const im = (t.image || "").trim();
  const wc = (t.wikimedia_commons || "").trim();
  const wd = (t.wikidata || "").trim();
  if (im) out.im = im;
  if (wc) out.wc = wc;
  if (/^Q\d+$/i.test(wd)) out.wd = wd.toUpperCase();
  return out;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function itemDates(i) {
  const out = [];
  if (i.date) {
    let ds = i.date, n = 0;
    do {
      out.push(ds);
      const dd = toDate(ds); dd.setDate(dd.getDate() + 1); ds = isoDate(dd);
    } while (i.dateEnd && ds <= i.dateEnd && ++n < 14);
  }
  if (i.kind === "filme" && Array.isArray(i.rewatches)) {
    for (const rw of i.rewatches) if (rw && rw.date && !out.includes(rw.date)) out.push(rw.date);
  }
  return out;
}

export function buildICS(it) {
  if (!it || !it.date) return "";
  const escIcs = s => String(s || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const ymd = s => s.replace(/-/g, "");
  const endBase = toDate(it.dateEnd && it.dateEnd > it.date ? it.dateEnd : it.date);
  endBase.setDate(endBase.getDate() + 1);
  const dtStart = ymd(it.date), dtEnd = ymd(isoDate(endBase));
  const now = new Date();
  const stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";
  const prefix = it.kind === "filme" ? "🎬 " : it.kind === "rest" ? "🍽️ " : "🎵 ";
  const loc = [it.where, it.city, it.osm && it.osm.ad].filter(Boolean).join(" — ");
  const desc = [KNAME[it.kind] || "", it.etype || "", it.artists ? "Line-up: " + it.artists : "", it.notes || ""].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nos Dois//PWA//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + (it.id || "ev") + "@nos-dois",
    "DTSTAMP:" + stamp,
    "DTSTART;VALUE=DATE:" + dtStart,
    "DTEND;VALUE=DATE:" + dtEnd,
    "SUMMARY:" + escIcs(prefix + (it.title || "Programa a dois")),
    loc ? "LOCATION:" + escIcs(loc) : "",
    desc ? "DESCRIPTION:" + escIcs(desc) : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean);
  return lines.join("\r\n") + "\r\n";
}

export function computeRetro(items, year) {
  const y = String(year || "");
  const inYear = i => i.status === "visto" && ((i.date || "").slice(0, 4) === y);
  const films = items.filter(i => i.kind === "filme" && inYear(i));
  const rewatches = [];
  for (const i of items) {
    if (i.kind !== "filme" || !Array.isArray(i.rewatches)) continue;
    for (const rw of i.rewatches) if (rw && (rw.date || "").slice(0, 4) === y) rewatches.push({ item: i, rw });
  }
  const rests = items.filter(i => i.kind === "rest" && inYear(i));
  const shows = items.filter(i => i.kind === "show" && inYear(i));
  const all = [...films, ...rests, ...shows];
  const raVals = all.filter(i => i.ra != null).map(i => i.ra);
  const rbVals = all.filter(i => i.rb != null).map(i => i.rb);
  const cVals = all.filter(i => i.rating != null).map(i => i.rating);
  const both = all.filter(i => i.ra != null && i.rb != null);
  const diffs = both.map(i => ({ item: i, diff: Math.abs(i.ra - i.rb) }));
  const syntony = diffs.length ? Math.max(0, Math.round(100 - avg(diffs.map(d => d.diff)) * 10)) : null;
  const exactMatches = diffs.filter(d => d.diff === 0).length;
  const closeMatches = diffs.filter(d => d.diff <= 0.5).length;
  const agreed = diffs.filter(d => d.diff <= 0.5).sort((a, b) => (b.item.rating ?? 0) - (a.item.rating ?? 0)).slice(0, 3).map(d => d.item);
  const diverged = diffs.filter(d => d.diff >= 1).sort((a, b) => b.diff - a.diff || (b.item.rating ?? 0) - (a.item.rating ?? 0)).slice(0, 3);
  const countMap = list => {
    const m = new Map();
    for (const x of list) if (x) m.set(x, (m.get(x) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, 5);
  };
  const topGenres = countMap(films.flatMap(i => (i.genre || "").split(",").map(x => x.trim()).filter(Boolean)));
  const topCuisines = countMap(rests.flatMap(i => (i.cuisine || "").split(",").map(x => x.trim()).filter(Boolean)));
  const showSpend = shows.reduce((t, i) => t + costN(i), 0);
  const bestItem = all.filter(i => i.rating != null).sort((a, b) => b.rating - a.rating)[0] || null;
  return {
    year: y,
    counts: { filmes: films.length, rewatches: rewatches.length, rest: rests.length, shows: shows.length, total: all.length + rewatches.length },
    avgA: avg(raVals), avgB: avg(rbVals), avgCouple: avg(cVals),
    bothCount: both.length, syntony, exactMatches, closeMatches,
    agreed, diverged, topGenres, topCuisines, showSpend, bestItem
  };
}

