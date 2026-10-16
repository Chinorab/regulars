import type { ConnectionPlan, Tier, TierChange, TierKey } from "./types";

export type Choice = "back" | "okay" | "not";
export const TIER_ORDER: TierKey[] = ["show_up", "come_back", "join_in"];

export type CheckinResult = {
  plan: ConnectionPlan;
  changes: TierChange[];
  // Work that needs fresh Qloo data on the server (one call per tier).
  server: { refill: TierKey[]; refresh: TierKey[]; addedSignalIds: string[] };
};

// Pure check in reducer (FR-014, FR-015). "Not for me" excludes the place and promotes a backup;
// "I'd go back" keeps it and makes it a taste signal for the later tiers; "It was okay" keeps it
// for one more visit.
export function applyCheckin(plan: ConnectionPlan, placeId: string, choice: Choice): CheckinResult {
  const idx = plan.tiers.findIndex((t) => t.featuredId === placeId);
  const changes: TierChange[] = [];
  const server: CheckinResult["server"] = { refill: [], refresh: [], addedSignalIds: plan.addedSignalIds };
  let tiers: Tier[] = plan.tiers.map((t) => ({ ...t }));
  let excluded = plan.excludedPlaceIds;
  let added = plan.addedSignalIds;

  if (idx < 0) return { plan, changes: TIER_ORDER.map((k) => ({ tierKey: k, kind: "unchanged" })), server };
  const tier = tiers[idx]!;

  if (choice === "not") {
    excluded = [...new Set([...excluded, placeId])];
    const [next, ...rest] = tier.backupIds;
    if (next) {
      tiers[idx] = { ...tier, featuredId: next, backupIds: rest, reconsider: false };
      changes.push({ tierKey: tier.key, kind: "replaced", fromId: placeId, toId: next });
    } else {
      tiers[idx] = { ...tier, featuredId: null, backupIds: [], status: "empty" };
      changes.push({ tierKey: tier.key, kind: "replaced", fromId: placeId });
      server.refill.push(tier.key);
    }
  } else if (choice === "okay") {
    tiers[idx] = { ...tier, reconsider: true };
    changes.push({ tierKey: tier.key, kind: "reconsider", fromId: placeId });
  } else {
    tiers[idx] = { ...tier, reconsider: false };
    added = [...new Set([...added, placeId])];
    changes.push({ tierKey: tier.key, kind: "unchanged", fromId: placeId });
    for (const later of TIER_ORDER.slice(idx + 1)) server.refresh.push(later);
  }

  for (const k of TIER_ORDER) if (!changes.some((c) => c.tierKey === k) && !server.refresh.includes(k)) changes.push({ tierKey: k, kind: "unchanged" });
  changes.sort((a, b) => TIER_ORDER.indexOf(a.tierKey) - TIER_ORDER.indexOf(b.tierKey));
  server.addedSignalIds = added;

  return {
    plan: { ...plan, tiers, excludedPlaceIds: excluded, addedSignalIds: added, updatedAt: new Date().toISOString() },
    changes,
    server,
  };
}

// Merge server refreshed tiers (new featured and backups with their places) into the plan.
export function mergeTiers(
  plan: ConnectionPlan,
  updates: { key: TierKey; featuredId: string | null; backupIds: string[]; status: Tier["status"] }[],
  places: ConnectionPlan["places"],
): { plan: ConnectionPlan; changes: TierChange[] } {
  const changes: TierChange[] = [];
  const tiers = plan.tiers.map((t) => {
    const u = updates.find((x) => x.key === t.key);
    if (!u) return t;
    changes.push({
      tierKey: t.key,
      kind: u.featuredId && u.featuredId !== t.featuredId ? "refreshed" : "unchanged",
      fromId: t.featuredId ?? undefined,
      toId: u.featuredId ?? undefined,
    });
    return { ...t, featuredId: u.featuredId, backupIds: u.backupIds, status: u.status, reconsider: false };
  });
  return { plan: { ...plan, tiers, places: { ...plan.places, ...places } }, changes };
}
