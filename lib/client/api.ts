"use client";

import type { ConnectionPlan, Entity, Profile, ResolvedLocality } from "@/lib/plan/types";

export type ApiError = { error: string; message: string; retryAfterSec?: number; resolvedTo?: string };

export class ClientApiError extends Error {
  constructor(public detail: ApiError) {
    super(detail.message);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ClientApiError({ error: "network", message: "You seem to be offline. Check your connection and try again." });
  }
  const json = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok || !json) {
    throw new ClientApiError(
      (json as ApiError) ?? { error: "server", message: "Something went wrong on our side. Please try again." },
    );
  }
  return json as T;
}

export const api = {
  resolve: (query: string) => post<{ matches: Entity[] }>("/api/resolve", { query }),
  locality: (query: string, city: string) => post<{ locality: ResolvedLocality }>("/api/locality", { query, city }),
  taste: (entityIds: string[], excludeTagIds: string[]) =>
    post<{
      taste: TagView[];
      rooms: TagView[];
      portrait: { headline: string; body: string } | null;
      fetchedAt: string;
    }>("/api/taste", { entityIds, excludeTagIds }),
};

export type TagView = { id: string; name: string; kind: string; affinity: number };

export type StreamEvent =
  | { type: "step"; label: string; tool: string; cacheHit?: boolean }
  | { type: "plan"; plan: ConnectionPlan }
  | { type: "error"; code: string; message: string };

// Reads an NDJSON stream line by line (contracts/http-api.md).
export async function streamNdjson(
  url: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onEvent({ type: "error", code: "network", message: "You seem to be offline. Check your connection and try again." });
    return;
  }
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => null)) as ApiError | null;
    onEvent({ type: "error", code: j?.error ?? "server", message: j?.message ?? "Something went wrong on our side. Please try again." });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as StreamEvent);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf) as StreamEvent);
}

export function planRequest(profile: Profile, extra: { excludedPlaceIds?: string[]; addedSignalIds?: string[] } = {}) {
  return { profile, excludedPlaceIds: extra.excludedPlaceIds ?? [], addedSignalIds: extra.addedSignalIds ?? [] };
}
