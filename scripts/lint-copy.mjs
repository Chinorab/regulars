// Copy lint (constitution V, FR-031): no em or en dashes, no emoji, no mention of AI in user
// facing text. Scans app/, components/, content/ and lib/ (prompts included, since they shape output).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dirs = ["app", "components", "content", "lib"];
const exts = [".ts", ".tsx", ".css", ".md"];

const rules = [
  { name: "em or en dash", re: /[–—]/ },
  { name: "emoji", re: /(?![©®™])\p{Extended_Pictographic}/u },
  {
    name: "AI mention in copy",
    // Only quoted strings and JSX text; identifiers like AGENT_MODEL are fine.
    re: /(["'`>][^"'`<]*\b(AI|A\.I\.|artificial intelligence|LLM|GPT|chatbot)\b[^"'`<]*["'`<])/,
  },
];

// Files allowed to mention the model (server code and sanitizers), not user facing copy.
const allow = [/lib[\\/]agent[\\/]run\.ts$/, /lib[\\/]agent[\\/]validate\.ts$/, /lib[\\/]agent[\\/]prompt\.ts$/, /lib[\\/]agent[\\/]portrait\.ts$/];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

let problems = 0;
for (const d of dirs) {
  for (const file of walk(join(root, d))) {
    const rel = relative(root, file);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const r of rules) {
        if (r.name !== "em or en dash" && allow.some((a) => a.test(rel))) continue;
        if (r.re.test(line)) {
          // The dash and emoji sanitizers name these characters by escape on purpose.
          if (/\\u201[34]|\\p\{Extended_Pictographic\}/.test(line)) continue;
          problems++;
          console.log(`${rel}:${i + 1}  ${r.name}: ${line.trim().slice(0, 140)}`);
        }
      }
    });
  }
}
if (problems) {
  console.error(`\n${problems} copy problem(s).`);
  process.exit(1);
}
console.log("Copy lint passed.");
