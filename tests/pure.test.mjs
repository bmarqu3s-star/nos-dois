import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  esc, norm, safeUrl, fmt, pad, isoDate, todayStr, toDate, fmtDate, firstDir,
  avg, coupleAvg, coupleSync, isWant, kc, kcs, kIcon, costN, brl, dayDiff,
  fmtRange, ticketTxt, keyOf, stripHtml, parseCSV, priceN,
  ohNorm, parseOH, ohState,
  syHash, sigOf, imgSig, syncable, idKey, fillMissing,
  osmCuisine, osmFlags
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
});
