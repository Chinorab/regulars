import "server-only";
import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";

// All keys live under "regulars:" because the Upstash database is shared with another project.
// 24 h cache of Qloo answers (clarification 2026-10-16). Keys are HMACs so the store
// never sees what a person typed (constitution III, FR-028).

export const CACHE_TTL_SECONDS = 60 * 60 * 24;

export type Cached<T> = { data: T; fetchedAt: string };

const secret = process.env.CACHE_KEY_SECRET;

export function hmac(input: string): string {
  if (!secret) throw new Error("CACHE_KEY_SECRET is not set");
  return createHmac("sha256", secret).update(input).digest("hex");
}

let redis: Redis | null | undefined;
export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

// In process fallback for local development (and if Redis is briefly unreachable).
const memory = new Map<string, { value: string; expires: number }>();

export async function cacheGet<T>(key: string): Promise<Cached<T> | null> {
  const k = `regulars:qloo:${hmac(key)}`;
  const r = getRedis();
  if (r) {
    try {
      const hit = await r.get<Cached<T>>(k);
      if (hit) return hit;
    } catch {
      // fall through to memory
    }
  }
  const m = memory.get(k);
  if (m && m.expires > Date.now()) return JSON.parse(m.value) as Cached<T>;
  return null;
}

export async function cacheSet<T>(key: string, value: Cached<T>): Promise<void> {
  const k = `regulars:qloo:${hmac(key)}`;
  const r = getRedis();
  if (r) {
    try {
      await r.set(k, value, { ex: CACHE_TTL_SECONDS });
      return;
    } catch {
      // fall through to memory
    }
  }
  memory.set(k, { value: JSON.stringify(value), expires: Date.now() + CACHE_TTL_SECONDS * 1000 });
}
