import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, hmac } from "@/lib/qloo/cache";

// Per visitor limits (research.md section 4). The identifier is an HMAC of the IP,
// never the raw address (FR-028).

type Bucket = "plan" | "light" | "mcp";
// A judge trying three samples, Compare and link worker needs about eight plan builds an hour.
const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);
const LIMITS: Record<Bucket, { tokens: number; windowSec: number }> = {
  plan: { tokens: num(process.env.RATE_LIMIT_PLAN_PER_HOUR, 12), windowSec: 60 * 60 },
  light: { tokens: num(process.env.RATE_LIMIT_LIGHT_PER_10MIN, 80), windowSec: 10 * 60 },
  mcp: { tokens: num(process.env.RATE_LIMIT_MCP_PER_HOUR, 12), windowSec: 60 * 60 },
};

const limiters = new Map<Bucket, Ratelimit>();
const memory = new Map<string, number[]>();

export function clientId(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip") || "local";
  return hmac(`ip:${ip}`).slice(0, 32);
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export async function limit(req: Request, bucket: Bucket): Promise<LimitResult> {
  const id = clientId(req);
  const cfg = LIMITS[bucket];
  const redis = getRedis();
  if (redis) {
    let l = limiters.get(bucket);
    if (!l) {
      l = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.tokens, `${cfg.windowSec} s`),
        prefix: `regulars:rl:${bucket}`,
      });
      limiters.set(bucket, l);
    }
    try {
      const r = await l.limit(id);
      return r.success ? { ok: true } : { ok: false, retryAfterSec: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
    } catch {
      // fall back to memory below
    }
  }
  const key = `${bucket}:${id}`;
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => now - t < cfg.windowSec * 1000);
  if (hits.length >= cfg.tokens) {
    const oldest = hits[0] ?? now;
    return { ok: false, retryAfterSec: Math.ceil((oldest + cfg.windowSec * 1000 - now) / 1000) };
  }
  hits.push(now);
  memory.set(key, hits);
  return { ok: true };
}

export function limited(retryAfterSec: number): Response {
  const minutes = Math.ceil(retryAfterSec / 60);
  return Response.json(
    {
      error: "rate_limited",
      retryAfterSec,
      message: `You have built several plans in a short time. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
