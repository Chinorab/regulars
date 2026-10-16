import { describe, expect, it } from "vitest";
import { PlaceEntity, PlaceInsights, TagInsight } from "@/lib/qloo/schemas";
import { formatTime, hoursFor, isDaytime, matchesTier, onlyLateNight, openOnDay, toPlace } from "@/lib/plan/place";
import { formatMiles, kmBetween } from "@/lib/plan/distance";
import { TIER_CATEGORIES } from "@/lib/qloo/categories";
import { readJson, remove, writeJson } from "@/lib/storage";

// Shapes mirror the live responses seen in scripts/04 (values are synthetic, not Qloo data).
const raw = {
  entity_id: "P1",
  name: "Example Books",
  location: { lat: 41.91, lon: -87.67 },
  tags: [
    "urn:tag:category:place:book_store",
    "urn:tag:genre:place:book_store",
    "urn:tag:accessibility:place:wheelchair_accessible_entrance",
    "urn:tag:time_of_day_fit:qloo:afternoon",
    "urn:tag:time_of_day_fit:qloo:evening",
  ],
  query: {
    affinity: 0.81,
    explainability: { "signal.interests.entities": [{ entity_id: "E1", score: 0.6 }, { entity_id: "E2", score: 0.4 }] },
  },
  properties: {
    address: "1 Example St",
    hours: { tuesday: [{ opens: "T12:00:00", closes: "T19:30:00", closed: false }], monday: [] },
    keywords: [{ name: "zines", count: 3 }, { name: "comics", count: 9 }],
    price_level: null,
    images: [{ url: "https://images.qloo.com/i/x.jpg" }],
  },
};

describe("toPlace", () => {
  const place = toPlace(PlaceEntity.parse(raw), "2026-10-16T00:00:00Z", { lat: 41.92, lon: -87.7 });

  it("keeps only payload fields", () => {
    expect(place.address).toBe("1 Example St");
    expect(place.priceLevel).toBeUndefined();
    expect(place.website).toBeUndefined();
    expect(place.categories).toEqual(["book_store"]);
    expect(place.stepFree).toBe(true);
    expect(place.barLike).toBe(false);
    expect(place.reviewKeywords[0]?.name).toBe("comics");
  });

  it("maps explainability and distance", () => {
    expect(place.contributions).toEqual([
      { entityId: "E1", score: 0.6 },
      { entityId: "E2", score: 0.4 },
    ]);
    expect(place.km).toBeGreaterThan(2);
    expect(place.km).toBeLessThan(3.5);
  });

  it("reads hours honestly", () => {
    expect(openOnDay(place, "tuesday")).toBe(true);
    expect(openOnDay(place, "monday")).toBe(false);
    expect(hoursFor(place, "tuesday")).toBe("12 pm to 7:30 pm");
    expect(hoursFor(place, "friday")).toBeUndefined();
    expect(isDaytime(place)).toBe(true);
    expect(onlyLateNight(place)).toBe(false);
  });

  it("checks tier membership against its own categories", () => {
    expect(matchesTier(place, TIER_CATEGORIES.show_up)).toBe(true);
    expect(matchesTier(place, TIER_CATEGORIES.join_in)).toBe(false);
  });

  it("flags drinking venues", () => {
    const bar = toPlace(PlaceEntity.parse({ ...raw, tags: ["urn:tag:genre:place:bar"] }), "x");
    expect(bar.barLike).toBe(true);
    expect(bar.stepFree).toBeUndefined();
  });
});

describe("schemas", () => {
  it("trims tag names", () => {
    expect(TagInsight.parse({ tag_id: "t", name: " indie rock" }).name).toBe("indie rock");
  });
  it("defaults empty insight results", () => {
    expect(PlaceInsights.parse({}).results.entities).toEqual([]);
  });
});

describe("distance and time", () => {
  it("computes km and miles", () => {
    expect(kmBetween({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.19, 1);
    expect(formatMiles(1.6)).toBe("1.0 mi");
  });
  it("formats Qloo times", () => {
    expect(formatTime("T00:00:00")).toBe("12 am");
    expect(formatTime("T18:45:00")).toBe("6:45 pm");
  });
});

describe("storage fallback", () => {
  it("works without window.localStorage", () => {
    writeJson("k", { a: 1 });
    expect(readJson<{ a: number }>("k")).toEqual({ a: 1 });
    remove("k");
    expect(readJson("k")).toBeNull();
  });
});
