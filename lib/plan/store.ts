"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson, remove, storageAvailable, writeJson } from "@/lib/storage";
import { PlanSchema, ProfileSchema, type ConnectionPlan, type Profile } from "./types";

// Everything lives in this browser only (FR-027). Keys are versioned so a schema change
// never crashes an old visitor: invalid data is simply ignored.
const KEYS = {
  profile: "regulars.v1.profile",
  plan: "regulars.v1.plan",
  checkins: "regulars.v1.checkins",
  moves: "regulars.v1.moves",
} as const;

export function loadProfile(): Profile | null {
  const r = ProfileSchema.safeParse(readJson(KEYS.profile));
  return r.success ? r.data : null;
}
export function saveProfile(p: Profile) {
  writeJson(KEYS.profile, p);
}

export function loadPlan(): ConnectionPlan | null {
  const r = PlanSchema.safeParse(readJson(KEYS.plan));
  return r.success ? r.data : null;
}
export function savePlan(p: ConnectionPlan) {
  writeJson(KEYS.plan, p);
}
export function clearPlan() {
  remove(KEYS.plan);
  remove(KEYS.moves);
}

export type StoredCheckIn = { placeId: string; tierKey: string; choice: "back" | "okay" | "not"; note?: string; at: string };
export function loadCheckins(): StoredCheckIn[] {
  return readJson<StoredCheckIn[]>(KEYS.checkins) ?? [];
}
export function addCheckin(c: StoredCheckIn) {
  writeJson(KEYS.checkins, [...loadCheckins(), c]);
}

export function loadMoves(): Record<string, boolean> {
  return readJson<Record<string, boolean>>(KEYS.moves) ?? {};
}
export function saveMoves(m: Record<string, boolean>) {
  writeJson(KEYS.moves, m);
}

export function clearAll() {
  for (const k of Object.values(KEYS)) remove(k);
}

// Hydration safe hook: renders null on the server, then the stored value.
export function useStored<T>(load: () => T | null) {
  const [value, setValue] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    setValue(load());
  }, [load]);
  const refresh = useCallback(() => setValue(load()), [load]);
  return { value, setValue, refresh, persistent: typeof window === "undefined" ? true : storageAvailable() };
}
