import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  esc, norm, safeUrl, fmt, pad, isoDate, todayStr, toDate, fmtDate, firstDir,
  avg, coupleAvg, coupleSync, isWant, kc, kcs, kIcon, costN, brl, dayDiff,
  fmtRange, ticketTxt, keyOf, stripHtml, parseCSV, priceN,
  ohNorm, parseOH, ohState,
  syHash, sigOf, imgSig, syncable, idKey, fillMissing,
  classifyLB, importLBItems, mergeSyncItem,
  osmCuisine, osmFlags, osmExtraTags,
  haversineKm, itemDates, buildICS, computeRetro
} from "../src/lib/pure.js";

describe("string & security helpers", () => {
  it("esc escapes HTML entities", () => {
    assert.equal(esc('<script>"a"&\'b\''), "&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;");
    assert.equal(esc(null), "");
  });

  it("norm removes accents, punctuation and lowercases", () => {
    assert.equal(norm("Amélie Poulain! (2001)"), "amelie poulain 2001");
    assert.equal(norm("  Café & Pão  "), "cafe pao");
  });

  it("safeUrl allows only http/https URLs", () => {
    assert.equal(safeUrl("https://letterboxd.com/film/parasite/"), "https://letterboxd.com/film/parasite/");
    assert.equal(safeUrl("http://example.com/path"), "http://example.com/path");
    assert.equal(safeUrl("javascript:alert(1)"), "");
    assert.equal(safeUrl("data:text/html,<script>"), "");
    assert.equal(safeUrl("vbscript:msgbox(1)"), "");
    assert.equal(safeUrl("not a url"), "");
    assert.equal(safeUrl(""), "");
  });

  it("stripHtml strips tags and converts line breaks", () => {
    assert.equal(stripHtml("<p>Ótimo filme!</p><br/>Recomendo."), "Ótimo filme!\n\nRecomendo.");
  });

  it("keyOf builds normalized title|year key", () => {
    assert.equal(keyOf("São Paulo", "2024"), "sao paulo|2024");
    assert.equal(keyOf("Matrix", ""), "matrix|");
  });
});

describe("numbers, dates & formatting", () => {
  it("fmt formats decimals with comma", () => {
    assert.equal(fmt(8), "8");
    assert.equal(fmt(8.5), "8,5");
  });

  it("pad pads single digits", () => {
    assert.equal(pad(3), "03");
    assert.equal(pad(12), "12");
  });

  it("isoDate & toDate & fmtDate round-trip", () => {
    const d = toDate("2025-07-04");
    assert.equal(isoDate(d), "2025-07-04");
    assert.equal(fmtDate("2025-07-04"), "04/07/2025");
    assert.equal(fmtDate(""), "");
  });

  it("firstDir extracts primary director", () => {
    assert.equal(firstDir("Bong Joon-ho"), "Bong Joon-ho");
    assert.equal(firstDir("Joel Coen, Ethan Coen"), "Joel Coen e outros");
    assert.equal(firstDir(""), "");
  });

  it("avg & coupleAvg compute averages", () => {
    assert.equal(avg([]), null);
    assert.equal(avg([8, 9]), 8.5);
    assert.equal(coupleAvg(8, 9), 8.5);
    assert.equal(coupleAvg(8, null), null);
    assert.equal(coupleAvg(null, 9), null);
  });

  it("costN & brl handle Brazilian currency values", () => {
    assert.equal(costN({ cost: "R$ 1.250,50" }), 1250.5);
    assert.equal(costN({ cost: "650" }), 650);
    assert.equal(costN({}), 0);
    assert.match(brl(150), /R\$\s*150/);
  });

  it("dayDiff & fmtRange calculate date and range strings", () => {
    assert.equal(dayDiff(todayStr()), 0);
    assert.equal(fmtRange({ date: "2025-05-01", dateEnd: "2025-05-03" }), "01–03/05/2025");
    assert.equal(fmtRange({ date: "2025-05-30", dateEnd: "2025-06-02" }), "30/05/2025 – 02/06/2025");
    assert.equal(fmtRange({ date: "2025-05-01" }), "01/05/2025");
    assert.equal(fmtRange({}), "");
  });

  it("priceN counts dollar signs", () => {
    assert.equal(priceN("R$$$"), 3);
    assert.equal(priceN(""), 0);
  });
});

describe("domain helpers (kinds, coupleSync, ticketTxt, isWant)", () => {
  it("kc, kcs, kIcon return CSS/suffix/icon keys", () => {
    assert.equal(kc({ kind: "filme" }), "film");
    assert.equal(kc({ kind: "rest" }), "rest");
    assert.equal(kc({ kind: "show" }), "show");
    assert.equal(kcs({ kind: "rest" }), "r");
    assert.equal(kIcon("show"), "music");
  });

  it("coupleSync updates rating when both ra and rb are present", () => {
    const it = { ra: 8, rb: 9, rating: null };
    coupleSync(it);
    assert.equal(it.rating, 8.5);

    const partial = { ra: 8, rb: null, rating: 7 };
    coupleSync(partial);
    assert.equal(partial.rating, 7);
  });

  it("isWant identifies wishlist movies", () => {
    assert.equal(isWant({ kind: "filme", status: "quero", want: true }), true);
    assert.equal(isWant({ kind: "filme", status: "quero", date: "2025-05-01" }), true);
    assert.equal(isWant({ kind: "filme", status: "quero", want: false }), false);
    assert.equal(isWant({ kind: "filme", status: "visto", want: true }), false);
  });

  it("ticketTxt formats ticket status", () => {
    assert.equal(ticketTxt("comprado"), "ingresso ok");
    assert.equal(ticketTxt("pendente"), "falta ingresso");
    assert.equal(ticketTxt(""), "");
  });
});

describe("CSV parser", () => {
  it("parses quoted fields, escaped quotes, BOM, and CRLF", () => {
    const csv = '\uFEFFName,Year,Review\r\n"Parasite, The",2019,"Muito ""bom"""\r\n';
    const rows = parseCSV(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Parasite, The");
    assert.equal(rows[0].year, "2019");
    assert.equal(rows[0].review, 'Muito "bom"');
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(parseCSV(""), []);
  });
});

describe("opening hours parser & evaluator", () => {
  it("ohNorm normalizes Portuguese weekdays and formats", () => {
    assert.equal(ohNorm("Seg-Sex 11:00–15:00"), "Mo-Fr 11:00-15:00");
    assert.equal(ohNorm("Sáb-Dom 12h30-23h"), "Sa-Su 12:30-23:00");
  });

  it("parseOH & ohState evaluate open/closed state", () => {
    const parsed = parseOH("Mo-Fr 11:00-15:00, 18:00-23:00; Sa 12:00-23:00");
    assert.ok(parsed);
    const monOpen = new Date(2025, 0, 6, 12, 30); // Monday
    const st1 = ohState("Mo-Fr 11:00-15:00, 18:00-23:00", monOpen);
    assert.equal(st1.known, true);
    assert.equal(st1.open, true);
    assert.equal(st1.until, "15:00");

    const monClosed = new Date(2025, 0, 6, 16, 0);
    const st2 = ohState("Mo-Fr 11:00-15:00, 18:00-23:00", monClosed);
    assert.equal(st2.known, true);
    assert.equal(st2.open, false);

    const sun = new Date(2025, 0, 5, 13, 0);
    const st3 = ohState("Mo-Fr 11:00-15:00", sun);
    assert.equal(st3.known, true);
    assert.equal(st3.open, false);
  });
});

describe("sync & merge helpers", () => {
  it("syHash & sigOf produce deterministic signatures", () => {
    assert.equal(syHash("abc"), syHash("abc"));
    assert.notEqual(syHash("abc"), syHash("abd"));
    assert.equal(sigOf({ id: "1", title: "A" }), sigOf({ id: "1", title: "A" }));
    assert.equal(imgSig("data:image/jpeg;base64,123456"), imgSig("data:image/jpeg;base64,123456"));
  });

  it("syncable skips unedited catalog/osm/imp items in quero without date/want", () => {
    assert.equal(syncable({ src: "catalogo", edited: false, status: "quero" }), false);
    assert.equal(syncable({ impOsm: "osm-1", edited: false, status: "quero" }), false);
    assert.equal(syncable({ src: "catalogo", edited: true, status: "quero" }), true);
    assert.equal(syncable({ src: "catalogo", want: true, status: "quero" }), true);
    assert.equal(syncable({ src: "manual", status: "quero" }), true);
  });

  it("idKey builds kind-aware identity keys", () => {
    assert.equal(idKey({ kind: "filme", title: "Parasita", year: "2019" }), "filme|parasita|2019");
    assert.equal(idKey({ kind: "rest", osm: { id: "node/123" } }), "osm|node/123");
    assert.equal(idKey({ kind: "rest", title: "Cantina", where: "Batel" }), "rest|cantina|batel");
    assert.equal(idKey({ kind: "show", title: "Festival", date: "2025-10-10" }), "show|festival|2025-10-10");
  });

  it("fillMissing fills only empty fields and merges status/att/coupleSync", () => {
    const dst = { ra: 8, rb: null, rating: null, status: "quero", where: "", att: [{ id: "a1" }] };
    const src = { ra: 6, rb: 9, status: "visto", where: "Cinema", notes: "Ótimo", att: [{ id: "a1" }, { id: "a2" }] };
    fillMissing(dst, src);
    assert.equal(dst.ra, 8);
    assert.equal(dst.rb, 9);
    assert.equal(dst.rating, 8.5);
    assert.equal(dst.status, "visto");
    assert.equal(dst.where, "Cinema");
    assert.equal(dst.notes, "Ótimo");
    assert.deepEqual(dst.att.map(a => a.id), ["a1", "a2"]);
  });
});

describe("OSM helpers", () => {
  it("osmCuisine maps known cuisines and defaults by amenity", () => {
    assert.equal(osmCuisine({ cuisine: "pizza;italian" }), "Pizzaria, Italiana");
    assert.equal(osmCuisine({ amenity: "cafe" }), "Café / Padaria");
  });

  it("osmFlags extracts amenities and diet flags", () => {
    const flags = osmFlags({ "diet:vegan": "yes", outdoor_seating: "yes", "payment:pix": "yes", internet_access: "wlan" });
    assert.deepEqual(flags, ["Opção vegana", "Área externa", "Wi-Fi", "Pix"]);
  });

  it("osmExtraTags extracts image, wikimedia_commons, and valid wikidata QID", () => {
    assert.deepEqual(
      osmExtraTags({ image: "https://example.com/a.jpg", wikimedia_commons: "File:Foo.jpg", wikidata: "q12345" }),
      { im: "https://example.com/a.jpg", wc: "File:Foo.jpg", wd: "Q12345" }
    );
    assert.deepEqual(osmExtraTags({ wikidata: "invalid" }), {});
  });
});

describe("Letterboxd classifyLB & importLBItems", () => {
  const makeItem = (kind, p = {}) => ({
    id: "id-" + Math.random().toString(36).slice(2, 8),
    kind, title: "", year: "", status: "visto", date: "", where: "",
    rating: null, ra: null, rb: null, lbRating: null, lbUri: "", notes: "", tags: [],
    edited: false, ...p
  });

  it("classifies files by filename and by CSV header fallback", () => {
    const got = {};
    const add = (k, rows) => { got[k] = rows; };
    classifyLB("watchlist.csv", [{ name: "Dune", year: "2021" }], add);
    classifyLB("custom.csv", [{ name: "Dune", "watched date": "2024-01-01" }], add);
    classifyLB("opinions.csv", [{ name: "Dune", review: "Ótimo" }], add);
    classifyLB("scores.csv", [{ name: "Dune", rating: "4.5" }], add);
    classifyLB("empty.csv", [], add);
    assert.deepEqual(Object.keys(got).sort(), ["diary", "ratings", "reviews", "watchlist"]);
  });

  it("imports watchlist, watched, ratings, diary, reviews without duplicating or overwriting couple ratings", () => {
    const items = [
      makeItem("filme", { id: "ex1", title: "Parasita", orig: "Parasite", year: "2019", status: "visto", ra: 9.5, rb: 10, rating: 9.75, date: "2020-02-01", edited: true })
    ];
    const r = importLBItems(items, {
      watchlist: [{ name: "Past Lives", year: "2023", "letterboxd uri": "https://boxd.it/1" }],
      watched: [{ name: "Parasite", year: "2019" }],
      ratings: [{ name: "Parasite", year: "2019", rating: "5" }],
      diary: [
        { name: "Parasite", year: "2019", "watched date": "2024-05-01", tags: "cinema, favorito" },
        { name: "Anatomy of a Fall", year: "2023", "watched date": "2024-06-10", rating: "4.5" }
      ],
      reviews: [{ name: "Anatomy of a Fall", year: "2023", review: "<p>Incrível!</p>" }]
    }, makeItem);

    assert.equal(r.created, 2);
    assert.equal(r.wl, 1);
    assert.equal(items.length, 3);

    const parasite = items.find(i => i.id === "ex1");
    assert.equal(parasite.ra, 9.5);
    assert.equal(parasite.rb, 10);
    assert.equal(parasite.rating, 9.75);
    assert.equal(parasite.date, "2020-02-01"); // edited item keeps couple date
    assert.equal(parasite.lbRating, 5);
    assert.deepEqual(parasite.tags, ["cinema", "favorito"]);

    const anatomy = items.find(i => i.title === "Anatomy of a Fall");
    assert.equal(anatomy.status, "visto");
    assert.equal(anatomy.date, "2024-06-10");
    assert.equal(anatomy.notes, "Incrível!");
  });
});

describe("sync item merging (mergeSyncItem)", () => {
  it("applies remote update when local item matches last synced signature", () => {
    const loc = { id: "1", kind: "filme", title: "Dune", year: "2021", status: "quero", ra: null, rb: null, rating: null };
    const items = [loc];
    const sigMap = { "1": sigOf(loc) };
    const remote = { ...loc, status: "visto", ra: 8, rb: 9 };
    const res = mergeSyncItem(items, "1", { j: JSON.stringify(remote) }, sigMap);
    assert.equal(res.changed, true);
    assert.equal(items[0].status, "visto");
    assert.equal(items[0].rating, 8.5);
  });

  it("preserves local unpushed edits on conflict", () => {
    const loc = { id: "1", kind: "filme", title: "Dune", year: "2021", status: "visto", notes: "Edição local" };
    const items = [loc];
    const sigMap = { "1": "old-sig" };
    const remote = { ...loc, notes: "Edição remota" };
    const res = mergeSyncItem(items, "1", { j: JSON.stringify(remote) }, sigMap);
    assert.equal(res.changed, false);
    assert.equal(items[0].notes, "Edição local");
  });

  it("merges duplicate unsynced local item by idKey and preserves missing fields", () => {
    const localDup = { id: "loc-1", kind: "filme", title: "Parasita", year: "2019", status: "visto", ra: 9, rb: 9, rating: 9, notes: "Nota local", rewatches: [{ date: "2025-01-10", where: "Casa" }] };
    const items = [localDup];
    const sigMap = {};
    const remote = { id: "rem-1", kind: "filme", title: "Parasita", year: "2019", status: "quero", ra: null, rb: null, rating: null, notes: "" };
    const res = mergeSyncItem(items, "rem-1", { j: JSON.stringify(remote) }, sigMap);
    assert.equal(res.changed, true);
    assert.equal(res.mergedDupId, "loc-1");
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "rem-1");
    assert.equal(items[0].status, "visto");
    assert.equal(items[0].rating, 9);
    assert.equal(items[0].notes, "Nota local");
    assert.equal(items[0].rewatches.length, 1);
  });

  it("handles tombstone deletion", () => {
    const loc = { id: "1", kind: "rest", title: "Bar" };
    const items = [loc];
    const sigMap = { "1": sigOf(loc) };
    const res = mergeSyncItem(items, "1", { del: true }, sigMap);
    assert.equal(res.changed, true);
    assert.equal(res.removedId, "1");
    assert.equal(items.length, 0);
    assert.equal(sigMap["1"], undefined);
  });
});

describe("Stage 3 helpers (haversineKm, itemDates, buildICS, computeRetro)", () => {
  it("haversineKm computes approximate distance in Curitiba", () => {
    // Praça Osório to Jardim Botânico (~4.3 km)
    const d = haversineKm(-25.4321, -49.2762, -25.4429, -49.2386);
    assert.ok(d > 3.5 && d < 4.5, `expected ~4km, got ${d}`);
    assert.equal(haversineKm(-25.43, -49.27, -25.43, -49.27), 0);
  });

  it("itemDates expands multi-day ranges and includes film rewatches", () => {
    assert.deepEqual(
      itemDates({ kind: "show", date: "2025-11-01", dateEnd: "2025-11-03" }),
      ["2025-11-01", "2025-11-02", "2025-11-03"]
    );
    assert.deepEqual(
      itemDates({ kind: "filme", date: "2024-03-10", rewatches: [{ date: "2025-05-01" }, { date: "2024-03-10" }] }),
      ["2024-03-10", "2025-05-01"]
    );
  });

  it("buildICS generates valid RFC 5545 VCALENDAR with exclusive DTEND", () => {
    const ics = buildICS({
      id: "ev1", kind: "show", title: "Festival, Edição; 2026",
      date: "2026-08-14", dateEnd: "2026-08-16", where: "Pedreira", city: "Curitiba",
      notes: "Levar capa\nde chuva"
    });
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /DTSTART;VALUE=DATE:20260814\r\n/);
    assert.match(ics, /DTEND;VALUE=DATE:20260817\r\n/);
    assert.match(ics, /SUMMARY:🎵 Festival\\, Edição\\; 2026\r\n/);
    assert.match(ics, /Levar capa\\nde chuva/);
    assert.match(ics, /END:VCALENDAR\r\n$/);
    assert.equal(buildICS({ title: "Sem data" }), "");
  });

  it("computeRetro calculates annual stats, syntony, genres, cuisines, spend and rewatches", () => {
    const items = [
      { kind: "filme", title: "F1", status: "visto", date: "2026-02-10", genre: "Drama, Suspense", ra: 9, rb: 9, rating: 9 },
      { kind: "filme", title: "F2", status: "visto", date: "2025-05-01", genre: "Comédia", ra: 8, rb: 8, rating: 8, rewatches: [{ date: "2026-03-15" }] },
      { kind: "rest", title: "R1", status: "visto", date: "2026-04-20", cuisine: "Japonesa", ra: 9, rb: 6, rating: 7.5 },
      { kind: "show", title: "S1", status: "visto", date: "2026-07-01", cost: "1.200,50", ra: 10, rb: 10, rating: 10 }
    ];
    const st = computeRetro(items, "2026");
    assert.equal(st.counts.filmes, 1);
    assert.equal(st.counts.rewatches, 1);
    assert.equal(st.counts.rest, 1);
    assert.equal(st.counts.shows, 1);
    assert.equal(st.counts.total, 4);
    assert.equal(st.exactMatches, 2);
    assert.equal(st.syntony, 90); // avg diff = (0 + 3 + 0) / 3 = 1 -> 100 - 10 = 90
    assert.equal(st.showSpend, 1200.5);
    assert.equal(st.bestItem.title, "S1");
    assert.equal(st.diverged[0].item.title, "R1");
    assert.equal(st.topGenres[0][0], "Drama");
    assert.equal(st.topCuisines[0][0], "Japonesa");
  });
});

