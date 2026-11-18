// Compila src/ (index.html, styles.css, lib/pure.js, data/catalog.js, app.js) para public/index.html e carimba a versão no service worker.
import { readFileSync, writeFileSync, cpSync } from "node:fs";
import { createHash } from "node:crypto";

const tpl = readFileSync("src/index.html", "utf8");
const css = readFileSync("src/styles.css", "utf8");
const pure = readFileSync("src/lib/pure.js", "utf8").replace(/^export\s+/gm, "");
const catalog = readFileSync("src/data/catalog.js", "utf8").replace(/^export\s+/gm, "");
const app = readFileSync("src/app.js", "utf8");
const sw = readFileSync("src/sw.js", "utf8");

const js = [pure, catalog, app].join("\n\n");
const html = tpl
  .replace("/* INLINE_CSS */", () => css)
  .replace("/* INLINE_JS */", () => js);

const v = createHash("sha256")
  .update(html)
  .update(sw)
  .digest("hex")
  .slice(0, 10);

cpSync("src/vendor", "public/vendor", { recursive: true });
writeFileSync("public/index.html", html);
writeFileSync("public/sw.js", sw.replace("__VERSION__", v));
writeFileSync("public/version.json", JSON.stringify({ version: v, built: new Date().toISOString() }) + "\n");
console.log("build ok · versão " + v);
