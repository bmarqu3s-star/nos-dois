// Compila src/ (index.html, styles.css, lib/pure.js, modules/*.js, app.js) para public/index.html,
// gera public/catalog.json separado, minifica CSS/JS com validação sintática e carimba a versão no SW.
import { readFileSync, writeFileSync, cpSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { CATALOG } from "../src/data/catalog.js";

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

/* Minificador JS leve e seguro: preserva strings, template literals (com ${}) e regex literals */
function minifyJS(code) {
  let out = "";
  let i = 0;
  const n = code.length;
  let lastSig = "";
  let lastWord = "";
  const tplStack = [];

  const isId = ch => /[A-Za-z0-9_$]/.test(ch);
  const canStartRegex = () => {
    if (!lastSig) return true;
    if ("([{:;,=!?&|+-*%^~<>".includes(lastSig)) return true;
    if (lastSig === "\n") return true;
    return /^(return|case|throw|in|of|typeof|void|delete|new|else|do|yield|await)$/.test(lastWord);
  };

  while (i < n) {
    const ch = code[i], nx = code[i + 1];

    /* Comentário de linha */
    if (ch === "/" && nx === "/") {
      i += 2;
      while (i < n && code[i] !== "\n") i++;
      continue;
    }
    /* Comentário de bloco */
    if (ch === "/" && nx === "*") {
      i += 2;
      while (i < n && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i += 2;
      if (out && !/\s$/.test(out)) out += " ";
      continue;
    }
    /* String simples ou dupla */
    if (ch === "'" || ch === '"') {
      const q = ch;
      let s = ch; i++;
      while (i < n) {
        const c = code[i++]; s += c;
        if (c === "\\" && i < n) s += code[i++];
        else if (c === q) break;
      }
      out += s; lastSig = q; lastWord = "";
      continue;
    }
    /* Template literal ou continuação após } de ${...} */
    if (ch === "`" || (ch === "}" && tplStack.length && tplStack[tplStack.length - 1] === 0)) {
      if (ch === "}") { tplStack.pop(); out += "}"; i++; }
      else { out += "`"; i++; }
      while (i < n) {
        const c = code[i++];
        if (c === "\\" && i < n) { out += c + code[i++]; continue; }
        if (c === "`") { out += "`"; lastSig = "`"; lastWord = ""; break; }
        if (c === "$" && code[i] === "{") {
          out += "${"; i++;
          tplStack.push(0);
          lastSig = "{"; lastWord = "";
          break;
        }
        out += c;
      }
      continue;
    }
    /* Regex literal */
    if (ch === "/" && canStartRegex()) {
      let s = "/", inClass = false; i++;
      while (i < n) {
        const c = code[i++]; s += c;
        if (c === "\\" && i < n) s += code[i++];
        else if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) break;
      }
      while (i < n && /[a-z]/i.test(code[i])) s += code[i++];
      out += s; lastSig = "/"; lastWord = "";
      continue;
    }
    /* Controle de chaves dentro de ${...} */
    if (tplStack.length) {
      if (ch === "{") tplStack[tplStack.length - 1]++;
      else if (ch === "}") tplStack[tplStack.length - 1]--;
    }
    /* Espaços e quebras de linha */
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      let hasNl = false;
      while (i < n && (code[i] === " " || code[i] === "\t" || code[i] === "\r" || code[i] === "\n")) {
        if (code[i] === "\n") hasNl = true;
        i++;
      }
      const next = code[i] || "";
      if (!out || !next) continue;
      if (hasNl) {
        if (!";{,([?:&|".includes(lastSig) && !"})]".includes(next)) {
          out += "\n";
          lastSig = "\n";
        }
      } else {
        const prev = out[out.length - 1];
        if ((isId(prev) && isId(next)) || (prev === "+" && next === "+") || (prev === "-" && next === "-") || (prev === "/" && next === "/")) {
          out += " ";
        }
      }
      continue;
    }
    /* Identificadores / palavras-chave */
    if (isId(ch)) {
      let w = "";
      while (i < n && isId(code[i])) w += code[i++];
      out += w; lastSig = w[w.length - 1]; lastWord = w;
      continue;
    }
    out += ch; lastSig = ch; lastWord = ""; i++;
  }
  return out.trim();
}

const MODULES = [
  "src/modules/state.js",
  "src/modules/sync.js",
  "src/modules/osm.js",
  "src/modules/tmdb.js",
  "src/modules/features.js",
  "src/modules/editor.js",
  "src/modules/views.js",
  "src/app.js"
];

const tpl = readFileSync("src/index.html", "utf8");
const rawCss = readFileSync("src/styles.css", "utf8");
const pure = readFileSync("src/lib/pure.js", "utf8").replace(/^export\s+/gm, "");
const rawJs = [pure, ...MODULES.map(f => readFileSync(f, "utf8"))].join("\n\n");
const sw = readFileSync("src/sw.js", "utf8");

const css = minifyCSS(rawCss);
const js = minifyJS(rawJs);

/* Validação sintática estrita do JS minificado */
new vm.Script(js, { filename: "public/index.html (inline)" });

const catalogJson = JSON.stringify(CATALOG);
const html = tpl
  .replace("/* INLINE_CSS */", () => css)
  .replace("/* INLINE_JS */", () => js);

const v = createHash("sha256")
  .update(html)
  .update(sw)
  .update(catalogJson)
  .digest("hex")
  .slice(0, 10);

cpSync("src/vendor", "public/vendor", { recursive: true });
writeFileSync("public/catalog.json", catalogJson);
writeFileSync("public/index.html", html);
writeFileSync("public/sw.js", sw.replace("__VERSION__", v));
writeFileSync("public/version.json", JSON.stringify({ version: v, built: new Date().toISOString() }) + "\n");

const pct = (raw, min) => Math.round((1 - min / raw) * 100);
console.log(
  `build ok · versão ${v} · index.html ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB ` +
  `(JS -${pct(rawJs.length, js.length)}%, CSS -${pct(rawCss.length, css.length)}%) · ` +
  `catalog.json ${(Buffer.byteLength(catalogJson) / 1024).toFixed(1)} KB`
);
