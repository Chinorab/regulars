import "server-only";
import { getRedis } from "./cache";

// The hackathon key allows 5 requests per second and 10,000 per month (live headers,
// 2026-10-16). We stop uncached calls at 9,000 a month and space calls 250 ms apart.

export const MONTHLY_LIMIT = Number(process.env.QLOO_MONTHLY_LIMIT ?? 9000);
const MIN_GAP_MS = 250;

let memoryCount = 0;
let memoryMonth = "";
let lastCall = 0;
let queue: Promise<void> = Promise.resolve();

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class QuotaError extends Error {
  code = "qloo_quota" as const;
}

// Reserve one call against the monthly budget; throws QuotaError when exhausted.
export async function reserveCall(): Promise<void> {
  const month = monthKey();
  const r = getRedis();
  if (r) {
    try {
      const key = `regulars:budget:qloo:${month}`;
      const n = await r.incr(key);
      if (n === 1) await r.expire(key, 60 * 60 * 24 * 35);
      if (n > MONTHLY_LIMIT) throw new QuotaError("Monthly Qloo budget reached");
      return;
    } catch (e) {
      if (e instanceof QuotaError) throw e;
    }
  }
  if (memoryMonth !== month) {
    memoryMonth = month;
    memoryCount = 0;
  }
  memoryCount++;
  if (memoryCount > MONTHLY_LIMIT) throw new QuotaError("Monthly Qloo budget reached");
}

// Serialize outbound calls within an instance so bursts stay under 5 per second.
export function throttle(): Promise<void> {
  const next = queue.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    lastCall = Date.now();
  });
  queue = next.catch(() => undefined);
  return next;
}
