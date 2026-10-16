import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assembleTiers, cleanTips, isGeneralTip } from "@/lib/agent/validate";
import { buildRequestText } from "@/lib/agent/prompt";
import { cleanProse } from "@/lib/agent/run";
import { acceptLocality } from "@/lib/plan/locality";
import { applyConstraints } from "@/lib/agent/tools";
import { DEFAULT_TIPS } from "@/content/tips";
import type { Place, Profile } from "@/lib/plan/types";
import { EvidenceRegistry } from "@/lib/agent/registry";

const results = { show_up: ["a", "b", "c", "d"], come_back: ["e", "f", "b"], join_in: [] as string[] };

describe("assembleTiers", () => {
  it("keeps only ids Qloo returned for that tier", () => {
    const { tiers, dropped } = assembleTiers(
      [
        { tier: "show_up", featured_id: "a", backup_ids: ["zzz", "c"], tips: [] },
        { tier: "come_back", featured_id: "a", backup_ids: [], tips: [] },
      ],
      results,
      new Set(),
    );
    expect(dropped).toEqual(["zzz", "a"]);
    expect(tiers[0]).toMatchObject({ featuredId: "a", backupIds: ["c", "b"], status: "ok" });
    expect(tiers[1]?.featuredId).toBe("e");
    expect(tiers[2]).toMatchObject({ featuredId: null, status: "empty" });
  });

  it("never repeats a place across tiers and respects exclusions", () => {
    const { tiers } = assembleTiers([], results, new Set(["come_back"]), new Set(["e"]));
    const all = tiers.flatMap((t) => [t.featuredId, ...t.backupIds]).filter(Boolean);
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain("e");
    expect(tiers[1]?.status).toBe("widened");
  });
});

describe("tips", () => {
  it("rejects venue facts", () => {
    expect(isGeneralTip("Go on Tuesday at 7 pm for the open mic.")).toBe(false);
    expect(isGeneralTip("Browse the science fiction shelves slowly.")).toBe(false);
    expect(isGeneralTip("It costs $5 to get in.")).toBe(false);
    expect(isGeneralTip("They host a reading circle.")).toBe(false);
    expect(isGeneralTip("Sit near the back — nobody minds.")).toBe(false);
  });
  it("keeps behavior advice and falls back to defaults", () => {
    expect(isGeneralTip("Ask the person at the counter what they would recommend.")).toBe(true);
    expect(cleanTips("join_in", ["10 people meet at 6"])).toEqual(DEFAULT_TIPS.join_in);
  });
});

describe("prose", () => {
  it("removes dashes and emoji", () => {
    expect(cleanProse("Quiet rooms — warm light \u{1F319}")).toBe("Quiet rooms, warm light");
  });
});

describe("locality", () => {
  it("accepts only US matches for the stated city", () => {
    expect(acceptLocality("Logan Square, Chicago, Cook County, Illinois, United States", "Chicago")).toBe(true);
    expect(acceptLocality("Doyenne de Banlieu, Besancon, France", "Chicago")).toBe(false);
    expect(acceptLocality("Chicago Heights, Illinois, United States", "Austin")).toBe(false);
    expect(acceptLocality(undefined, "Austin")).toBe(false);
  });
});

const profile: Profile = {
  loves: [
    { query: "Miles Davis", entity: { id: "m", name: "Miles Davis", kind: "Artist" } },
    { query: "John Coltrane", entity: { id: "j", name: "John Coltrane", kind: "Artist" } },
  ],
  locality: { query: "Ballard, Seattle", name: "Ballard", disambiguation: "Ballard, Seattle, United States" },
  city: "Seattle",
  budget: "free",
  evenings: ["tuesday"],
  noAlcohol: true,
  socialEase: 1,
  removedTagIds: [],
  needs: { daytime: true, stepFree: true },
};

describe("request text", () => {
  it("is plain and complete", () => {
    const t = buildRequestText(profile);
    expect(t).toContain("I love Miles Davis and John Coltrane.");
    expect(t).toContain("I don't drink.");
    expect(t).toContain("Tuesday");
    expect(t).not.toMatch(/[–—]/);
  });
});

const base = (over: Partial<Place>): Place => ({
  id: "x",
  name: "X",
  categories: ["park"],
  reviewKeywords: [],
  timeOfDay: ["afternoon"],
  barLike: false,
  contributions: [],
  fetchedAt: "t",
  ...over,
});

describe("constraints", () => {
  it("applies alcohol, price, days, daytime and ease", () => {
    const ctx = { profile, registry: new EvidenceRegistry(), excludedPlaceIds: [], addedSignalIds: [], onStep: () => {} };
    const places = [
      base({ id: "ok", stepFree: true }),
      base({ id: "bar", barLike: true }),
      base({ id: "pricey", priceLevel: 3 }),
      base({ id: "closed", hours: { tuesday: [] } }),
      base({ id: "night", timeOfDay: ["late_night"] }),
      base({ id: "unknown-access" }),
    ];
    const { kept, removed } = applyConstraints(places, "show_up", ctx);
    expect(kept.map((p) => p.id)).toEqual(["ok", "unknown-access"]);
    expect(removed).toBe(4);
  });
});
