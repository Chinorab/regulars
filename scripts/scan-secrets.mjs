// Secret scan (constitution III): no keys in tracked source or in the client bundle.
// Checks the repository files git would commit, then .next/static if a build exists.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const patterns = [
  { name: "Anthropic key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Upstash token", re: /\bA[A-Za-z0-9]{30,}=?\b(?=.*upstash)/i },
  { name: "Generic secret assignment", re: /(QLOO_API_KEY|ANTHROPIC_API_KEY|UPSTASH_REDIS_REST_TOKEN|CACHE_KEY_SECRET)[ 	]*[:=][ 	]*["']?[A-Za-z0-9_\-]{16,}/ },
];

// Real values from the local env file, so even unknown formats are caught.
const values = [];
if (existsSync(join(root, ".env.local"))) {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const v = line.slice(line.indexOf("=") + 1).trim();
    if (v.length >= 16) values.push(v);
  }
}

const files = execSync("git ls-files --cached --others --exclude-standard", { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .map((f) => join(root, f));

function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const bundle = existsSync(join(root, ".next", "static")) ? walk(join(root, ".next", "static")) : [];

let found = 0;
for (const file of [...files, ...bundle]) {
  if (!existsSync(file) || statSync(file).size > 5_000_000) continue;
  const text = readFileSync(file, "utf8");
  for (const p of patterns) {
    if (p.re.test(text)) {
      found++;
      console.log(`${file}: ${p.name}`);
    }
  }
  for (const v of values) {
    if (text.includes(v)) {
      found++;
      console.log(`${file}: contains a value from .env.local`);
    }
  }
}
if (found) {
  console.error(`\n${found} possible secret(s).`);
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} source files, ${bundle.length} bundle files).`);
