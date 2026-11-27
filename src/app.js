/* ---------- eventos & bootstrap ---------- */
const debouncedList = debounce(kind => { const l = $("#list"); if (l) l.innerHTML = listHTML(kind); }, 150);
const debouncedSug = debounce(() => { const l = $("#sgl"); if (l) l.innerHTML = sugList(); }, 150);

document.addEventListener("click", async e => {
  if (e.target === $("#modal")) return closeModal();
  if (e.target === $("#tmx")) return closeExplorer();
  if (e.target === $("#feat")) return closeFeat();
  const t = e.target.closest("[data-act]"); if (!t) return;
  const a = t.dataset.act, id = t.dataset.id;
  switch (a) {
    case "nav": go(t.dataset.sec, t.dataset.to); break;
    case "add": {
      const s = ui.sec;
      if (s === "filmes") openEditor(null, "filme", { status: ui.filmes.st === "quero" ? "quero" : "visto" });
      else if (s === "rest") openEditor(null, "rest", { status: ui.rest.st === "quero" ? "quero" : "visto" });
      else if (s === "eventos") openEditor(null, "show", { status: ui.shows.st === "quero" ? "quero" : "visto" });
      else openEditor(null, "filme", { status: s === "agenda" ? "quero" : "visto" });
      break;
    }
    case "open": openEditor(id); break;
    case "attopen": openAtt(id, t.dataset.t || null, t.dataset.a); break;
    case "attrm": readForm(); ED.it.att = (ED.it.att || []).filter(x => x.id !== t.dataset.a); drawEditor(); break;
    case "avclose": closeAtt(); break;
    case "avz": avZoom(+t.dataset.z); break;
    case "avgo": if (AV) { AV.i = +t.dataset.k; AV.z = 1; drawAtt(); } break;
    case "avretry": drawAtt(); break;
    case "avshare": attShare(); break;
    case "agview": ui.ag.view = t.dataset.v; render(); break;
    case "agnav": {
      const n = +t.dataset.n, td = todayStr();
      if (n === 0) { ui.ag.m = td.slice(0, 7); ui.ag.d = td; }
      else { const [y, m] = (ui.ag.m || td.slice(0, 7)).split("-").map(Number), d = new Date(y, m - 1 + n, 1); ui.ag.m = d.getFullYear() + "-" + pad(d.getMonth() + 1); ui.ag.d = ""; }
      render(); break;
    }
    case "agday": {
      const d = t.dataset.d; ui.ag.d = ui.ag.d === d ? "" : d; if (d.slice(0, 7) !== ui.ag.m) ui.ag.m = d.slice(0, 7);
      render(); { const el = $("#agdet"); if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } break;
    }
    case "agadd": openEditor(null, "filme", { status: "quero", date: t.dataset.d }); break;
    case "want": {
      e.stopPropagation();
      const it = S.items.find(x => x.id === id); if (!it) break;
      if (isWant(it) && it.date) { toast("Está programado na Agenda. Tire a data para removê-lo daqui."); break; }
      it.want = !isWant(it); save(it.id); render();
      toast(it.want ? `“${it.title}” em Queremos ver` : "Tirado de Queremos ver");
      break;
    }
    case "concluir": e.stopPropagation(); openEditor(id, null, { status: "visto" }); break;
    case "agendar": e.stopPropagation(); openEditor(id, null, { focus: "date" }); break;
    case "ics": e.stopPropagation(); exportICS(id); break;
    case "sharecard": e.stopPropagation(); shareItemCard(id); break;
    case "shareretro": shareRetroCard(t.dataset.y); break;
    case "close": closeModal(); break;
    case "save": saveEditor(); break;
    case "del": if (await askConfirm("Este registro e a foto serão apagados.", "Excluir")) { syncDelete(ED.id); S.items = S.items.filter(i => i.id !== ED.id); delImg(ED.id); save(); closeModal(); render(); toast("Excluído"); } break;
    case "setkind": { const title = $("#f_title")?.value || "", st = ED.it.status; openEditor(null, t.dataset.kind, { status: st, title, date: ED.it.date }); break; }
    case "setst": {
      readForm(); ED.it.status = t.dataset.st; if (ED.it.kind === "filme" && ED.it.status === "quero") ED.it.want = true;
      if (ED.it.status === "visto" && (!ED.it.date || ED.it.date > todayStr())) ED.it.date = todayStr();
      drawEditor(); break;
    }
    case "pick": $("#" + t.dataset.in).click(); break;
    case "rmphoto": ED.photo = null; ED.preview = null; readForm(); drawEditor(); break;
    case "osmphoto": readForm(); osmFetchPhotoIntoEditor(ED.it, false); break;
    case "rwadd": {
      if (!ED) break;
      readForm();
      const d = ($("#rw_date") && $("#rw_date").value) || todayStr();
      const w = ($("#rw_where") && $("#rw_where").value || "").trim();
      const n = ($("#rw_notes") && $("#rw_notes").value || "").trim();
      ED.it.rewatches = [...(ED.it.rewatches || []), { date: d, where: w, notes: n }];
      drawEditor(); toast("Rewatch adicionado (clique em Guardar)");
      break;
    }
    case "rwrm": {
      if (!ED) break;
      readForm();
      const idx = +t.dataset.i;
      ED.it.rewatches = (ED.it.rewatches || []).filter((_, k) => k !== idx);
      drawEditor();
      break;
    }
    case "clr": { const r = t.closest(".rate"); delete r.dataset.set; r.querySelector(".rv").textContent = "—"; updCouple(); break; }
    case "rsec": ui.rest.sec = t.dataset.s; render(); $("#view").scrollTop = 0; break;
    case "mapst": ui.map.st = t.dataset.v; render(); break;
    case "mapnear": mapFindNearMe(); break;
    case "roulopen0": openRoulette(t.dataset.k || "all"); break;
    case "rknd": if (ROUL) { ROUL.kind = t.dataset.v; ROUL.pick = null; drawRoulette(); } break;
    case "rfm": if (ROUL) { ROUL.filmMode = t.dataset.v; ROUL.pick = null; drawRoulette(); } break;
    case "rropen": if (ROUL) { ROUL.restOpen = !ROUL.restOpen; ROUL.pick = null; drawRoulette(); } break;
    case "rrprice": if (ROUL) { ROUL.restMaxP = ROUL.restMaxP === 2 ? 0 : 2; ROUL.pick = null; drawRoulette(); } break;
    case "rrnov": if (ROUL) { ROUL.restNov = !ROUL.restNov; ROUL.pick = null; drawRoulette(); } break;
    case "roulspin": spinRoulette(); break;
    case "roulopen": closeFeat(); openEditor(id); break;
    case "roulplan": {
      const it = S.items.find(x => x.id === id);
      closeFeat();
      if (it) openEditor(it.id, null, { focus: "date", date: todayStr() });
      break;
    }
    case "retro": openRetro(); break;
    case "retroy": if (RETRO) { RETRO.year = t.dataset.y; drawRetro(); } break;
    case "retroopen": closeFeat(); openEditor(id); break;
    case "featclose": closeFeat(); break;
    case "rkmore": ui.rk.n += 10; render(); break;
    case "sgmore": ui.sg.n += 12; render(); break;
    case "sgchip": ui.sg.q = norm(ui.sg.q) === norm(t.dataset.w) ? "" : t.dataset.w; ui.sg.n = 12; render(); break;
    case "newvisit": { const key = t.dataset.key; if (ED) closeModal(); newVisit(key); break; }
    case "chip": { const u = ui[t.dataset.k]; u.st = t.dataset.st; u.touched = true; u.n = 60; render(); break; }
    case "more": { const u = ui[KUI[t.dataset.k]]; u.n += 60; $("#list").innerHTML = listHTML(t.dataset.k); break; }
    case "torate": { const need = k => S.items.some(i => i.kind === k && i.status === "visto" && i.rating == null); if (need("filme")) { ui.filmes.st = "avaliar"; go("filmes"); } else if (need("rest")) { ui.rest.st = "avaliar"; go("rest"); } else if (need("show")) { ui.shows.st = "avaliar"; go("eventos"); } break; }
    case "catalog": {
      try {
        toast("Baixando catálogo…");
        const r = await loadCatalog();
        ui.cat = `<b>${r.created}</b> filmes novos em “Quero ver” e <b>${r.enriched}</b> existentes enriquecidos com diretor, gênero e posição no ranking.`;
        render(); toast("Catálogo atualizado");
      } catch (err) { ui.cat = "Erro ao carregar catálogo: " + esc(err.message || err); render(); }
      break;
    }
    case "catalogrm": { const rm = S.items.filter(i => i.src === "catalogo" && !i.edited && i.status === "quero" && !hasImg(i.id)); if (!rm.length) { toast("Nada para remover"); break; } if (await askConfirm(`${rm.length} filmes do catálogo que você não alterou serão removidos da lista.`, "Remover")) { const ids = new Set(rm.map(i => i.id)); S.items = S.items.filter(i => !ids.has(i.id)); save(); ui.cat = `${rm.length} itens removidos.`; render(); } break; }
    case "tmdb": enrichTMDB(false); break;
    case "tmdball": enrichTMDB(true); break;
    case "tmone": tmOne(); break;
    case "imcount": imCount(); break;
    case "imrun": imRun(); break;
    case "imcancel": imStop = true; toast("Parando…"); break;
    case "imundo": imUndo(); break;
    case "syin": syIn(); break;
    case "syout": syOut(); break;
    case "sycreate": syCreate(); break;
    case "syjoin": syJoin(SY.code); break;
    case "syinvite": syInvite(); break;
    case "synow": syncSoon(0); toast("Sincronizando…"); break;
    case "syretry": SY.loading = null; SY.err = ""; syLoad(); syUi(); break;
    case "sycopy": try { await navigator.clipboard.writeText(SY.invite.url); toast("Link copiado"); } catch (e) { toast("Copie o link manualmente"); } break;
    case "osmrun": osmRun(); break;
    case "osmfind": osmSearch("ed"); break;
    case "osmsearch": osmSearch("cfg"); break;
    case "osmpick": osmPick(+t.dataset.i); break;
    case "osmadd": osmAdd(+t.dataset.i); break;
    case "osmcancel": osmStop = true; toast("Parando…"); break;
    case "osmundo": osmUndo(); break;
    case "osmimgs": osmFetchPhotosBatch(); break;
    case "osmimgstop": osmImgStop = true; toast("Parando…"); break;
    case "setwhere": { const w = $("#f_where"); if (w) w.value = t.dataset.v; break; }
    case "txopen": openExplorer(t.dataset.tab); break;
    case "txclose": closeExplorer(); break;
    case "txtab": TX.tab = t.dataset.tab; TX.detail = null; TX.person = null; drawTX(); txLoad(true); break;
    case "txmode": TX.mode = t.dataset.mode; TX.detail = null; TX.person = null; drawTX(); txLoad(true); break;
    case "txapply": TX.detail = null; txLoad(true); break;
    case "txmore": TX.page++; txLoad(false); break;
    case "txback": if (TX.detail) TX.detail = null; else TX.person = null; drawTXList(); break;
    case "txdetail": txOpenDetail(parseInt(id, 10)); break;
    case "txperson": txOpenPerson(parseInt(id, 10)); break;
    case "txadd": txAddFlow(parseInt(id, 10), t.dataset.st, t); break;
    case "txedit": closeExplorer(); openEditor(id); break;
    case "backup": exportBackup(); break;
    case "csv": exportCSV(); break;
    case "wipe": if (await askConfirm("Todos os filmes, restaurantes e fotos deste aparelho serão apagados. Faça um backup antes.", "Apagar tudo")) { S = { v: 1, names: S.names, items: [], theme: S.theme, catalogV: 1 }; IMG_KEYS.clear(); ATT_KEYS.clear(); mediaCacheClear(); syReset(); await dbWrite("img", s => s.clear()); save(); ui.imp = ui.pst = ""; renderShell(); render(); toast("Tudo apagado"); } break;
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Tab") {
    const ov = !$("#dlg").hidden ? $("#dlg") : !$("#attv").hidden ? $("#attv") : !$("#feat").hidden ? $("#feat") : !$("#tmx").hidden ? $("#tmx") : !$("#modal").hidden ? $("#modal") : null;
    if (ov) trapTab(e, ov);
  }
  if (e.key === "Escape") { if (!$("#dlg").hidden) { $("#dlg").click(); } else if (AV) closeAtt(); else if (ROUL || RETRO) closeFeat(); else if (TX) closeExplorer(); else if (ED) closeModal(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.matches('.rate input[type="range"]')) {
    const r = t.closest(".rate"), val = parseFloat(t.value); r.dataset.set = "1"; r.querySelector(".rv").textContent = fmt(val);
    updCouple();
  }
  if (t.dataset.sgq !== undefined) { ui.sg.q = t.value; ui.sg.n = 12; document.querySelectorAll(".wantchips .chip").forEach(c => c.setAttribute("aria-pressed", String(norm(ui.sg.q) === norm(c.dataset.w)))); debouncedSug(); return; }
  if (t.id === "f_hr") { hrHint(); return; }
  if (t.id === "f_title" && e.inputType === "insertReplacementText") { setTimeout(placeAutofill, 0); return; }
  if (t.dataset.rbairro !== undefined || t.dataset.rcuis !== undefined) { if (t.dataset.rbairro !== undefined) ui.rest.bairro = t.value; else ui.rest.cuis = t.value; ui.rest.n = 60; debouncedList("rest"); return; }
  if (t.dataset.fdir !== undefined || t.dataset.fcast !== undefined) { if (t.dataset.fdir !== undefined) ui.filmes.dir = t.value; else ui.filmes.cast = t.value; ui.filmes.n = 60; debouncedList("filme"); return; }
  if (t.dataset.sart !== undefined) { ui.shows.art = t.value; ui.shows.n = 60; debouncedList("show"); return; }
  if (t.dataset.txq !== undefined && TX) { TX.q = t.value; clearTimeout(txT); txT = setTimeout(() => { TX.detail = null; TX.person = null; txLoad(true); }, 450); return; }
  if (t.dataset.q) { const u = ui[t.dataset.q]; u.q = t.value; u.n = 60; debouncedList(KOF[t.dataset.q]); }
});

document.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset.stype !== undefined) { ui.shows.t = t.value; ui.shows.n = 60; $("#list").innerHTML = listHTML("show"); return; }
  if (t.dataset.syear !== undefined) { ui.shows.y = t.value; ui.shows.n = 60; $("#list").innerHTML = listHTML("show"); return; }
  if (t.dataset.maprad !== undefined) { ui.map.radius = +t.value || 5; render(); return; }
  if (t.dataset.rk) { ui.rk[t.dataset.rk] = t.value; ui.rk.n = 10; render(); return; }
  if (t.dataset.sg) { ui.sg[t.dataset.sg] = t.value; ui.sg.n = 12; render(); return; }
  if (t.id === "f_title" && ED && ED.it.kind === "rest" && ED.isNew) { setTimeout(placeAutofill, 0); return; }
  if (t.id === "f_hr") { hrHint(); return; }
  if (t.dataset.genre) { ui.filmes.g = t.value; ui.filmes.n = 60; $("#list").innerHTML = listHTML("filme"); return; }
  if (t.dataset.sycode !== undefined) { SY.code = t.value; return; }
  if (t.dataset.osf) { ui.osf[t.dataset.osf] = t.checked ? "1" : ""; return; }
  if (t.dataset.imf) { ui.imf[t.dataset.imf] = t.type === "checkbox" ? (t.checked ? "1" : "") : t.value.trim(); return; }
  if (t.dataset.txf && TX) { TX.f[t.dataset.txf] = t.type === "checkbox" ? (t.checked ? "1" : "") : t.value; return; }
  if (t.id === "tkey") { TMDBKEY = t.value.trim(); dbWrite("kv", st => st.put(TMDBKEY, "tmdbKey")); return; }
  if (t.dataset.sort) { const u = ui[t.dataset.sort]; u.sort = t.value; u.n = 60; $("#list").innerHTML = listHTML(KOF[t.dataset.sort]); return; }
  if (t.id === "nA" || t.id === "nB") { S.names = [$("#nA").value.trim() || "Eu", $("#nB").value.trim() || "Ela"]; save(); renderShell(); return; }
  if (t.dataset.att && t.files && t.files.length && ED) {
    const ty = t.dataset.att; readForm();
    for (const f of [...t.files]) {
      try { const r = await attRead(f, ty); const a = { id: uid(), t: ty, n: (f.name || "").replace(/\.[^.]+$/, "").slice(0, 40) || (ty === "lineup" ? "Line-up" : "Ingresso"), m: r.m, c: r.c }; attSave(a.id, r.blob); ED.it.att = [...(ED.it.att || []), a]; if (r.m === "application/pdf") warmPdf(); } catch (err) { toast((err && err.message) || "Não consegui anexar"); }
    }
    t.value = ""; drawEditor(); return;
  }
  if (!t.files || !t.files.length) return;
  const files = [...t.files]; t.value = "";
  if (t.id === "fLB") { ui.imp = "Importando…"; render(); await handleImport(files); }
  else if (t.id === "fPst") { ui.pst = "Processando imagens…"; render(); await handlePosters(files); }
  else if (t.id === "fRs") await restoreBackup(files[0]);
  else if (t.id === "fPh") {
    try {
      readForm();
      const b = await resizeImage(files[0]);
      if (ED._rev && ED.preview && ED.preview.startsWith("blob:")) try { URL.revokeObjectURL(ED.preview); } catch (e) { }
      ED.photo = b; ED.preview = URL.createObjectURL(b); ED._rev = true;
      drawEditor();
    } catch (err) { toast("Não consegui ler essa imagem"); }
  }
});

/* ---------- início ---------- */
(async function init() {
  await loadAll();
  if (S.items.some(i => (i.att || []).some(a => a.m === "application/pdf"))) setTimeout(warmPdf, 2500);
  applyTheme();
  syBoot();
  if (!S.catalogV) {
    loadCatalog().then(cat => {
      if (cat && cat.created) { render(); toast(`Catálogo carregado: ${cat.created} filmes em “Quero ver”`); }
    }).catch(() => { });
  }
})();
