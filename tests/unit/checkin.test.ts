import { describe, expect, it } from "vitest";
import { applyCheckin, mergeTiers } from "@/lib/plan/checkin";
import type { ConnectionPlan } from "@/lib/plan/types";

const plan = (): ConnectionPlan => ({
  id: "p",
  createdAt: "t",
  updatedAt: "t",
  requestText: "r",
  tiers: [
    { key: "show_up", featuredId: "a", backupIds: ["b"], tips: [], status: "ok", reconsider: false },
    { key: "come_back", featuredId: "c", backupIds: [], tips: [], status: "ok", reconsider: false },
    { key: "join_in", featuredId: "d", backupIds: [], tips: [], status: "ok", reconsider: false },
  ],
  places: {},
  excludedPlaceIds: [],
  addedSignalIds: [],
  steps: [],
});

describe("applyCheckin", () => {
  it("not for me: excludes and promotes a backup", () => {
    const r = applyCheckin(plan(), "a", "not");
    expect(r.plan.tiers[0]?.featuredId).toBe("b");
    expect(r.plan.excludedPlaceIds).toContain("a");
    expect(r.changes[0]).toMatchObject({ kind: "replaced", fromId: "a", toId: "b" });
    expect(r.server.refill).toEqual([]);
  });

  it("not for me without backups asks the server to refill", () => {
    const r = applyCheckin(plan(), "c", "not");
    expect(r.plan.tiers[1]).toMatchObject({ featuredId: null, status: "empty" });
    expect(r.server.refill).toEqual(["come_back"]);
  });

  it("it was okay: keeps and marks for reconsideration", () => {
    const r = applyCheckin(plan(), "a", "okay");
    expect(r.plan.tiers[0]).toMatchObject({ featuredId: "a", reconsider: true });
    expect(r.changes.map((c) => c.kind)).toEqual(["reconsider", "unchanged", "unchanged"]);
  });

  it("I'd go back: adds the place as a signal and refreshes later tiers", () => {
    const r = applyCheckin(plan(), "a", "back");
    expect(r.plan.addedSignalIds).toEqual(["a"]);
    expect(r.server.refresh).toEqual(["come_back", "join_in"]);
    expect(r.server.addedSignalIds).toEqual(["a"]);
  });

  it("merges refreshed tiers", () => {
    const r = mergeTiers(plan(), [{ key: "join_in", featuredId: "z", backupIds: [], status: "ok" }], {});
    expect(r.plan.tiers[2]?.featuredId).toBe("z");
    expect(r.changes[0]).toMatchObject({ tierKey: "join_in", kind: "refreshed", fromId: "d", toId: "z" });
  });
});
