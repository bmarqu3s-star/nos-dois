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
  return coupleSync(r);
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
