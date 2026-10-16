// Minimal Qloo client for the live API probes. Reads QLOO_API_KEY from .env.local.
// Raw responses are written to scripts/output/ which is gitignored: Qloo terms forbid
// storing response data in a public repository.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://hackathon.api.qloo.com";

function loadKey() {
  if (process.env.QLOO_API_KEY) return process.env.QLOO_API_KEY;
  const env = readFileSync(join(root, ".env.local"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("QLOO_API_KEY="));
  const key = line?.slice("QLOO_API_KEY=".length).trim();
  if (!key) throw new Error("QLOO_API_KEY missing from .env.local");
  return key;
}

const KEY = loadKey();

export async function qloo(path, params = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const started = Date.now();
  let res;
  let retries = 0;
  for (;;) {
    await throttle();
    res = await fetch(url, { headers: { "X-Api-Key": KEY, accept: "application/json" } });
    if (res.status !== 429 || retries >= 4) break;
    stats.rateLimited++;
    const wait = Number(res.headers.get("retry-after")) * 1000 || 1000 * 2 ** retries;
    retries++;
    await new Promise((r) => setTimeout(r, wait));
  }
  stats.calls++;
  const limits = Object.fromEntries([...res.headers].filter(([k]) => /rate|limit|retry/i.test(k)));
  if (Object.keys(limits).length) stats.lastLimitHeaders = limits;
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { status: res.status, ms: Date.now() - started, retries, url: url.pathname + url.search, body };
}

// Space calls out: the hackathon key answers 429 on short bursts.
const MIN_GAP_MS = Number(process.env.QLOO_GAP_MS ?? 350);
let last = 0;
async function throttle() {
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}

export const stats = { calls: 0, rateLimited: 0, lastLimitHeaders: null };

export function save(name, data) {
  const dir = join(root, "scripts", "output");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2));
}
