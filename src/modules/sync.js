/* ---------- sincronização do casal (Firebase: login Google + Firestore, plano Spark) ---------- */
const FB_CFG = { apiKey: "AIzaSyCblqUFnvOyKc6QNV3LPspsxr99KTg4hKo", authDomain: "nos-dois-87ec5.firebaseapp.com", projectId: "nos-dois-87ec5", storageBucket: "nos-dois-87ec5.firebasestorage.app", messagingSenderId: "1005815658591", appId: "1:1005815658591:web:981685d8b505d2ba7f83ea" };
const FB_V = "10.14.1";
const SY = {
  F: null, app: null, auth: null, fs: null, user: null, uid: "", cid: null, couple: null,
  err: "", msg: "", busy: false, loading: null, unsub: [],
  sig: {}, isig: {}, aup: {}, namesSig: "",
  dirty: new Set(), dirtyImgs: new Set(), fullScan: false,
  lastPullItems: 0, lastPullImgs: 0, last: 0, code: "", invite: null, pendingInvite: ""
};
const syPersist = () => dbWrite("kv", s => s.put({
  cid: SY.cid, uid: SY.uid, sig: SY.sig, isig: SY.isig, aup: SY.aup,
  dirty: [...SY.dirty], dirtyImgs: [...SY.dirtyImgs], fullScan: SY.fullScan,
  lastPullItems: SY.lastPullItems, lastPullImgs: SY.lastPullImgs, namesSig: SY.namesSig
}, "sync"));

async function syLoadState() {
  try {
    const v = db && await req2p(db.transaction("kv").objectStore("kv").get("sync"));
    if (v) {
      SY.cid = v.cid || null; SY.uid = v.uid || ""; SY.sig = v.sig || {}; SY.isig = v.isig || {}; SY.aup = v.aup || {};
      SY.dirty = new Set(v.dirty || []);
      SY.dirtyImgs = new Set(v.dirtyImgs || []);
      SY.fullScan = v.fullScan !== undefined ? !!v.fullScan : !Array.isArray(v.dirty);
      SY.lastPullItems = v.lastPullItems ?? v.lastPull ?? 0;
      SY.lastPullImgs = v.lastPullImgs ?? v.lastPull ?? 0;
      SY.namesSig = v.namesSig || "";
    } else {
      SY.fullScan = true;
    }
  } catch (e) { }
}
function syErr(e) {
  const c = (e && (e.code || "")) + "";
  if (/permission-denied/.test(c)) return "Sem permissão no Firestore. As regras já foram publicadas (npm run deploy)?";
  if (/popup-blocked/.test(c)) return "O navegador bloqueou a janela de login do Google. Libere pop-ups para este site.";
  if (/unavailable|network/.test(c)) return "Sem conexão agora. Continua funcionando neste aparelho e sincroniza quando a internet voltar.";
  if (/resource-exhausted/.test(c)) return "Limite diário do plano gratuito atingido. Sincroniza de novo amanhã.";
  if (/unauthorized-domain/.test(c)) return "Este endereço não está autorizado no login do Firebase.";
  return (e && e.message) || "Erro de sincronização.";
}
function syPendingCount() {
  if (!SY.cid) return 0;
  if (SY.fullScan) {
    let n = 0;
    for (const it of S.items) if (syncable(it) && SY.sig[it.id] !== sigOf(it)) n++;
    return n;
  }
  let n = SY.dirtyImgs.size;
  if (SY.dirty.size) {
    const byId = new Map(S.items.map(i => [i.id, i]));
    for (const id of SY.dirty) {
      const it = byId.get(id);
      if (it && syncable(it) && SY.sig[id] !== sigOf(it)) n++;
    }
  }
  return n;
}
function updateSyncBadge() {
  const b = $("#syncBadge");
  if (!b) return;
  if (!SY.cid) { b.hidden = true; return; }
  const pending = SY.dirty.size > 0 || SY.dirtyImgs.size > 0 || SY.fullScan;
  if (SY.busy) { b.hidden = false; b.textContent = "Sincronizando…"; b.dataset.st = "busy"; }
  else if (!navigator.onLine) { b.hidden = false; b.textContent = pending ? "Offline · pendente" : "Offline"; b.dataset.st = "off"; }
  else if (SY.err) { b.hidden = false; b.textContent = "Erro no sync"; b.dataset.st = "err"; }
  else if (pending && syPendingCount() > 0) { b.hidden = false; b.textContent = "Pendente…"; b.dataset.st = "wait"; }
  else { b.hidden = true; b.dataset.st = ""; }
}
addEventListener("online", () => { if (SY.cid) syncSoon(500); updateSyncBadge(); });
addEventListener("offline", () => updateSyncBadge());
function syUi() { const e = $("#syncCard"); if (e) e.outerHTML = syncCard(); updateSyncBadge(); }
function syRender() { clearTimeout(SY.rt); SY.rt = setTimeout(() => { renderShell(); if (!ED) render(); else syUi(); }, 300); }
function syLoad() {
  if (SY.loading) return SY.loading;
  SY.loading = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${FB_V}/`;
    const [A, Au, Fs] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")]);
    SY.F = { ...A, ...Au, ...Fs };
    SY.app = A.initializeApp(FB_CFG);
    SY.auth = Au.getAuth(SY.app);
    try { SY.fs = Fs.initializeFirestore(SY.app, { localCache: Fs.persistentLocalCache({ tabManager: Fs.persistentMultipleTabManager() }) }); } catch (e) { SY.fs = Fs.getFirestore(SY.app); }
    Au.onAuthStateChanged(SY.auth, syAuth);
    syUi();
  })().catch(() => { SY.loading = null; SY.err = "Não consegui carregar o Firebase (sem internet ou bloqueado)."; syUi(); });
  return SY.loading;
}
function stopSync() { SY.unsub.forEach(f => { try { f(); } catch (e) { } }); SY.unsub = []; SY.couple = null; }
async function syAuth(user) {
  stopSync(); SY.user = user; SY.err = "";
  if (!user) { syUi(); return; }
  if (SY.uid && SY.uid !== user.uid) { SY.sig = {}; SY.isig = {}; SY.aup = {}; SY.dirty.clear(); SY.dirtyImgs.clear(); SY.fullScan = true; SY.lastPullItems = 0; SY.lastPullImgs = 0; SY.cid = null; SY.namesSig = ""; }
  SY.uid = user.uid;
  try {
    const { doc, getDoc } = SY.F;
    let cid = null;
    try { const us = await getDoc(doc(SY.fs, "users", user.uid)); cid = us.exists() ? us.data().cid : null; } catch (e) { cid = SY.cid; if (!cid) throw e; }
    if (SY.pendingInvite && !cid) { await syJoin(SY.pendingInvite); return; }
    if (SY.pendingInvite && cid) { syClearInvite(); SY.msg = "Esta conta já faz parte de um casal; o convite foi ignorado."; }
    if (cid) await syStart(cid); else { SY.cid = null; syPersist(); }
  } catch (e) { SY.err = syErr(e); if (SY.pendingInvite) { syClearInvite(); } }
  syUi();
}
async function syStart(cid) {
  const { doc, collection, query, where, onSnapshot, Timestamp, updateDoc } = SY.F, fs = SY.fs, cref = doc(fs, "couples", cid);
  SY.cid = cid; SY.uid = SY.user.uid; syPersist();
  const bad = e => { SY.err = syErr(e); syUi(); };
  SY.unsub.push(onSnapshot(cref, s => { if (!s.exists()) return; SY.couple = s.data(); syNamesIn(); syUi(); }, bad));
  updateDoc(cref, { ["people." + SY.user.uid]: { n: SY.user.displayName || "", e: SY.user.email || "" } }).catch(() => { });
  const sinceItems = Timestamp.fromMillis(Math.max(0, SY.lastPullItems - 60000));
  const sinceImgs = Timestamp.fromMillis(Math.max(0, SY.lastPullImgs - 60000));
  SY.unsub.push(onSnapshot(query(collection(cref, "items"), where("u", ">", sinceItems)), syPullItems, bad));
  SY.unsub.push(onSnapshot(query(collection(cref, "imgs"), where("u", ">", sinceImgs)), syPullImgs, bad));
  syncSoon(1500);
}
const delImgLocal = id => { delete SY.isig[id]; SY.dirtyImgs.delete(id); delImg(id, true); };
async function syPullItems(snap) {
  let ch = false, maxU = SY.lastPullItems;
  for (const c of snap.docChanges()) {
    if (c.type === "removed") continue;
    const dd = c.doc, d = dd.data(); if (dd.metadata.hasPendingWrites || !d.u) continue;
    maxU = Math.max(maxU, d.u.toMillis());
    const id = dd.id;
    const res = mergeSyncItem(S.items, id, d, SY.sig);
    if (res.removedId) { delImgLocal(id); SY.dirty.delete(id); ch = true; }
    else if (res.changed) {
      SY.dirty.delete(id);
      if (res.mergedDupId) {
        if (hasImg(res.mergedDupId) && !hasImg(id)) {
          const blob = await getImgBlob(res.mergedDupId);
          if (blob) setImg(id, blob, true);
        }
        delImgLocal(res.mergedDupId);
        SY.dirty.delete(res.mergedDupId);
      }
      ch = true;
    }
  }
  if (maxU > SY.lastPullItems) SY.lastPullItems = maxU;
  syPersist(); SY.last = Date.now();
  if (ch) { save(); attGC(); attFetchMissing(); syRender(); } else syUi();
}
async function syPullImgs(snap) {
  let ch = false, maxU = SY.lastPullImgs;
  for (const c of snap.docChanges()) {
    if (c.type === "removed") continue;
    const dd = c.doc, d = dd.data(); if (dd.metadata.hasPendingWrites || !d.u) continue;
    maxU = Math.max(maxU, d.u.toMillis());
    const id = dd.id;
    if (d.del) { if (hasImg(id)) { delImgLocal(id); ch = true; } delete SY.isig[id]; continue; }
    if (!d.d) continue;
    if (hasImg(id) && SY.dirtyImgs.has(id)) {
      const cur = await getImgDataUrl(id);
      if (cur && SY.isig[id] !== imgSig(cur)) continue; /* foto local ainda não enviada */
    }
    SY.isig[id] = imgSig(d.d);
    SY.dirtyImgs.delete(id);
    setImg(id, d.d, true);
    ch = true;
  }
  if (maxU > SY.lastPullImgs) SY.lastPullImgs = maxU;
  syPersist();
  if (ch) syRender();
}
function syNamesIn() {
  const c = SY.couple; if (!c || !c.names) return;
  const ns = JSON.stringify(S.names), rs = JSON.stringify(c.names);
  if (rs === ns) { SY.namesSig = ns; return; }
  if (ns === SY.namesSig) { S.names = c.names; SY.namesSig = rs; save(); syRender(); } else syncSoon(1500);
}
let syTimer = null;
function syncSoon(ms = 2500) { updateSyncBadge(); if (!SY.cid || !SY.user || !SY.F) return; clearTimeout(syTimer); syTimer = setTimeout(syPush, ms); }
async function syPush() {
  if (!SY.cid || !SY.user || !SY.F || SY.busy || !navigator.onLine) return;
  SY.busy = true; SY.err = ""; updateSyncBadge();
  try {
    const { doc, writeBatch, serverTimestamp, updateDoc } = SY.F, fs = SY.fs, cid = SY.cid, byId = new Map(S.items.map(i => [i.id, i])), ops = [];
    const refd = new Set();
    for (const it of S.items) {
      if (!syncable(it)) continue;
      for (const a of (it.att || [])) {
        refd.add(a.id);
        if (!hasAtt(a.id) || SY.aup[a.id]) continue;
        const d = await getAttDataUrl(a.id);
        if (!d || d.length > AMAX) continue;
        const c = Math.ceil(d.length / ACH), b = writeBatch(fs);
        for (let n = 0; n < c; n++) b.set(doc(fs, "couples", cid, "files", a.id + "_" + n), { d: d.slice(n * ACH, (n + 1) * ACH), i: n, u: serverTimestamp() });
        await b.commit();
        SY.aup[a.id] = c;
      }
    }
    for (const id of Object.keys(SY.aup)) if (!refd.has(id)) { const b = writeBatch(fs); for (let n = 0; n < SY.aup[id]; n++) b.delete(doc(fs, "couples", cid, "files", id + "_" + n)); b.commit().catch(() => { }); delete SY.aup[id]; }

    /* Sync incremental: só recalcula sigOf nos dirtyIds (ou varre tudo se fullScan estiver ativo) */
    const itemPool = SY.fullScan ? S.items : [...SY.dirty].map(id => byId.get(id)).filter(Boolean);
    for (const it of itemPool) {
      if (!syncable(it)) { SY.dirty.delete(it.id); continue; }
      const h = sigOf(it);
      if (SY.sig[it.id] !== h) ops.push({ ref: doc(fs, "couples", cid, "items", it.id), data: { j: JSON.stringify(it), u: serverTimestamp(), by: SY.user.uid }, k: "sig", id: it.id, h });
      else SY.dirty.delete(it.id);
    }

    const imgPool = SY.fullScan ? [...IMG_KEYS] : [...SY.dirtyImgs].filter(id => hasImg(id));
    for (const id of imgPool) {
      const it = byId.get(id);
      if (!it || !syncable(it)) { SY.dirtyImgs.delete(id); continue; }
      const d = await getImgDataUrl(id);
      if (!d || d.length > 900000) { SY.dirtyImgs.delete(id); continue; }
      const h = imgSig(d);
      if (SY.isig[id] !== h) ops.push({ ref: doc(fs, "couples", cid, "imgs", id), data: { d, u: serverTimestamp() }, k: "isig", id, h });
      else SY.dirtyImgs.delete(id);
    }

    const delImgPool = SY.fullScan ? Object.keys(SY.isig) : [...SY.dirtyImgs].filter(id => !hasImg(id));
    for (const id of delImgPool) {
      if (!hasImg(id) && byId.has(id) && SY.isig[id] !== undefined) {
        ops.push({ ref: doc(fs, "couples", cid, "imgs", id), data: { del: true, d: "", u: serverTimestamp() }, k: "isig", id, h: null });
      } else if (!hasImg(id)) {
        SY.dirtyImgs.delete(id);
      }
    }

    for (let i = 0; i < ops.length; i += 300) {
      const part = ops.slice(i, i + 300), b = writeBatch(fs);
      part.forEach(o => b.set(o.ref, o.data));
      await b.commit();
      part.forEach(o => {
        if (o.k === "sig") { SY.sig[o.id] = o.h; SY.dirty.delete(o.id); }
        else if (o.h) { SY.isig[o.id] = o.h; SY.dirtyImgs.delete(o.id); }
        else { delete SY.isig[o.id]; SY.dirtyImgs.delete(o.id); }
      });
    }
    SY.fullScan = false;
    const ns = JSON.stringify(S.names);
    if (SY.namesSig !== ns && SY.couple && JSON.stringify(SY.couple.names) !== ns) { await updateDoc(doc(fs, "couples", cid), { names: S.names }).catch(() => { }); }
    SY.namesSig = ns;
    SY.last = Date.now(); syPersist();
  } catch (e) { SY.err = syErr(e); }
  SY.busy = false; syUi();
}
function syncDelete(id) {
  SY.dirty.delete(id); SY.dirtyImgs.delete(id);
  if (!SY.cid || !SY.user || !SY.F || SY.sig[id] === undefined) return;
  const { doc, writeBatch, serverTimestamp } = SY.F, b = writeBatch(SY.fs);
  b.set(doc(SY.fs, "couples", SY.cid, "items", id), { del: true, j: "", u: serverTimestamp(), by: SY.user.uid });
  if (SY.isig[id] !== undefined) b.set(doc(SY.fs, "couples", SY.cid, "imgs", id), { del: true, d: "", u: serverTimestamp() });
  b.commit().catch(() => { }); delete SY.sig[id]; delete SY.isig[id]; syPersist();
}
function syReset() { SY.sig = {}; SY.isig = {}; SY.aup = {}; SY.dirty.clear(); SY.dirtyImgs.clear(); SY.fullScan = true; SY.lastPullItems = 0; SY.lastPullImgs = 0; SY.namesSig = ""; syPersist(); }
async function syIn() {
  try { await syLoad(); const { GoogleAuthProvider, signInWithPopup } = SY.F; await signInWithPopup(SY.auth, new GoogleAuthProvider()); }
  catch (e) { if (!/popup-closed|cancelled-popup/.test((e && e.code) || "")) { SY.err = syErr(e); syUi(); } }
}
async function syOut() { try { await SY.F.signOut(SY.auth); } catch (e) { } SY.msg = "Você saiu. Os dados continuam neste aparelho."; syUi(); }
async function syCreate() {
  try {
    SY.err = ""; const { doc, collection, setDoc, serverTimestamp } = SY.F, fs = SY.fs, u = SY.user, ref = doc(collection(fs, "couples"));
    await setDoc(ref, { members: [u.uid], names: S.names, createdAt: serverTimestamp(), v: 1 });
    await setDoc(doc(fs, "users", u.uid), { cid: ref.id });
    SY.namesSig = JSON.stringify(S.names);
    SY.fullScan = true;
    await syStart(ref.id);
  } catch (e) { SY.err = syErr(e); }
  syUi();
}
async function syJoin(code) {
  code = (code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  try {
    SY.err = ""; if (!code) throw new Error("Digite o código do convite.");
    const { doc, getDoc, updateDoc, setDoc, deleteDoc, arrayUnion } = SY.F, fs = SY.fs, u = SY.user;
    const inv = await getDoc(doc(fs, "invites", code));
    if (!inv.exists() || inv.data().exp < Date.now()) throw new Error("Convite inválido, usado ou vencido. Peça um novo.");
    const cid = inv.data().cid;
    SY.namesSig = JSON.stringify(S.names);
    SY.fullScan = true;
    await updateDoc(doc(fs, "couples", cid), { members: arrayUnion(u.uid), invite: code });
    await setDoc(doc(fs, "users", u.uid), { cid });
    deleteDoc(doc(fs, "invites", code)).catch(() => { });
    syClearInvite(); SY.msg = "Pronto! Vocês estão conectados.";
    await syStart(cid);
  } catch (e) { SY.err = syErr(e); syClearInvite(); }
  syUi();
}
async function syInvite() {
  try {
    SY.err = ""; const { doc, setDoc } = SY.F, al = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", code = [...crypto.getRandomValues(new Uint8Array(8))].map(x => al[x % al.length]).join("");
    await setDoc(doc(SY.fs, "invites", code), { cid: SY.cid, by: SY.user.uid, exp: Date.now() + 7 * 864e5 });
    SY.invite = { code, url: location.origin + "/?convite=" + code }; syUi();
    try { if (navigator.share) await navigator.share({ title: "Nós Dois", text: "Entre no nosso diário a dois:", url: SY.invite.url }); } catch (e) { }
  } catch (e) { SY.err = syErr(e); syUi(); }
}
function syClearInvite() { SY.pendingInvite = ""; try { localStorage.removeItem("nd_invite"); } catch (e) { } }
async function syBoot() {
  const m = /[?&]convite=([A-Za-z0-9]+)/.exec(location.search);
  if (m) { try { localStorage.setItem("nd_invite", m[1].toUpperCase()); } catch (e) { } try { history.replaceState(null, "", location.pathname); } catch (e) { } }
  try { SY.pendingInvite = localStorage.getItem("nd_invite") || ""; } catch (e) { }
  await syLoadState();
  if (SY.pendingInvite) { go("ajustes", "syncCard"); toast("Convite recebido: entre com o Google para entrar no espaço do casal"); }
  if (SY.cid || SY.pendingInvite) syLoad();
}
function syncCard() {
  const u = SY.user, c = SY.couple, btn = (a, t, cls = "") => `<button class="btn ${cls}" data-act="${a}">${t}</button>`;
  let b = "";
  if (!SY.F) b = SY.err ? `<p class="muted">${esc(SY.err)}</p><div class="btns">${btn("syretry", "Tentar de novo", "primary")}</div>` : `<p class="muted">Preparando…</p>`;
  else if (!u) b = `<p class="muted" style="font-size:14px">Cada um entra com a sua conta Google e os dois passam a ver o mesmo diário, nos dois celulares. Continua funcionando sem internet e sincroniza quando voltar.${SY.pendingInvite ? " <b>Você recebeu um convite:</b> entre para aceitar." : ""}</p><div class="btns">${btn("syin", "Entrar com Google", "primary")}</div>`;
  else if (!SY.cid) b = `<p class="muted" style="font-size:14px">Conectado como <b>${esc(u.email || "")}</b>. Falta criar o espaço do casal ou entrar com um convite.</p><div class="btns">${btn("sycreate", "Criar nosso espaço", "primary")}</div><div class="fld" style="margin-top:14px"><label class="f" for="sycode">Recebeu um convite? Cole o código</label><div class="row2" style="gap:8px"><input type="text" id="sycode" data-sycode="1" autocapitalize="characters" placeholder="K7M2QX9P" value="${esc(SY.code)}">${btn("syjoin", "Entrar com convite")}</div></div>`;
  else {
    const ppl = c && c.people ? Object.values(c.people) : [], n = c && c.members ? c.members.length : 1;
    const pend = SY.F && ui.sec === "ajustes" ? syPendingCount() : 0;
    b = `<p style="font-size:14px;margin:0 0 6px">${n >= 2 ? "Conectados" : "Conectado"}: ${ppl.map(p => `<b>${esc(p.n || p.e)}</b>`).join(" e ") || `<b>${esc(u.email || "")}</b>`}</p>
    <p class="muted" style="font-size:13px;margin:0">${n < 2 ? "Falta a outra pessoa: gere um convite abaixo. " : ""}${navigator.onLine ? (pend ? `${pend} alterações a enviar.` : "Tudo sincronizado.") : "Sem internet: sincroniza quando voltar."}${SY.last ? " Última troca " + new Date(SY.last).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + "." : ""}</p>
    <div class="btns">${n < 2 ? btn("syinvite", "Convidar", "primary") : btn("syinvite", "Novo convite")}${btn("synow", "Sincronizar agora")}${btn("syout", "Sair")}</div>
    ${SY.invite ? `<div class="out" style="margin-top:10px"><b>Link do convite</b> (vale 7 dias, uma pessoa só):<br><span style="overflow-wrap:anywhere">${esc(SY.invite.url)}</span><br>Código: <b>${esc(SY.invite.code)}</b><div class="btns" style="margin-top:8px">${btn("sycopy", "Copiar link")}</div></div>` : ""}`;
  }
  return `<div class="card2" id="syncCard"><h3>Sincronizar entre os dois</h3>${SY.msg ? `<p style="font-size:14px">${esc(SY.msg)}</p>` : ""}${SY.err && SY.F ? `<p class="warn" style="margin:8px 0">${esc(SY.err)}</p>` : ""}${b}<p class="attr">Fotos grandes demais e itens importados em lote que ninguém mexeu não sobem (dá para importar de novo em cada aparelho).</p></div>`;
}
