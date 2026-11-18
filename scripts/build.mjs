// Copia src/index.html para public/ e carimba a versão (hash do conteúdo) no service worker.
import { readFileSync, writeFileSync, cpSync } from "node:fs";
import { createHash } from "node:crypto";
const html = readFileSync("src/index.html", "utf8");
const sw = readFileSync("src/sw.js", "utf8");
const v = createHash("sha256").update(html).update(sw).digest("hex").slice(0, 10);
cpSync("src/vendor", "public/vendor", { recursive: true });
writeFileSync("public/index.html", html);
writeFileSync("public/sw.js", sw.replace("__VERSION__", v));
writeFileSync("public/version.json", JSON.stringify({ version: v, built: new Date().toISOString() }) + "\n");
console.log("build ok · versão " + v);
