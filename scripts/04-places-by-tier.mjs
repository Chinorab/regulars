// Probe 4: real places per tier for each sample profile, with explainability.
// Measures which venue fields exist (hours, price, accessibility, time of day, keywords),
// how neighborhood location queries resolve, and how hours / bar exclusion filters behave.
import { readFileSync } from "node:fs";
import { qloo, save, stats } from "./qloo.mjs";
import { PROFILES } from "./profiles.mjs";

const entities = JSON.parse(readFileSync(new URL("./output/01-entities.json", import.meta.url)));
const C = (s) => `urn:tag:category:place:${s}`;
const TIERS = {
  show_up: [C("record_store"), C("book_store"), C("park"), C("botanical_garden"), C("museum"), C("library"), C("jazz_club"), C("live_music_venue")],
  come_back: [C("cafe"), C("coffee_shop"), C("comic_book_store"), C("game_store"), C("rock_climbing_gym"), C("yoga_studio")],
  join_in: [C("board_game_club"), C("community_garden"), C("community_center"), C("art_studio"), C("pottery_classes"), C("dance_school")],
};
const DRINKING = [C("bar"), C("pub"), C("brewery"), C("night_club"), C("cocktail_bar"), C("wine_bar")];

const km = (a, b) => {
  const R = 6371, r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const coverage = {};
const bump = (k, ok) => { coverage[k] ??= [0, 0]; coverage[k][1]++; if (ok) coverage[k][0]++; };

const out = {};
for (const p of PROFILES) {
  const ids = entities[p.id].map((r) => r.top?.id).filter(Boolean);
  out[p.id] = { location: p.location, tiers: {} };
  console.log(`\n=== ${p.id} (${p.location})`);
  for (const [tier, cats] of Object.entries(TIERS)) {
    const r = await qloo("/v2/insights", {
      "filter.type": "urn:entity:place",
      "signal.interests.entities": ids.join(","),
      "filter.location.query": p.location,
      "filter.tags": cats.join(","),
      "filter.exclude.tags": DRINKING.join(","),
      "feature.explainability": "true",
      take: 8,
    });
    const loc = r.body.query?.localities?.filter?.[0];
    const list = r.body.results?.entities ?? [];
    out[p.id].tiers[tier] = { status: r.status, ms: r.ms, locality: loc?.disambiguation, places: [] };
    console.log(`  ${tier}: ${r.status} ${r.ms}ms n=${list.length} locality="${loc?.disambiguation ?? "none"}" ${r.status !== 200 ? JSON.stringify(r.body).slice(0, 200) : ""}`);
    for (const e of list) {
      const pr = e.properties ?? {};
      const tags = (e.tags ?? []).map((t) => (typeof t === "string" ? t : t.id ?? t.tag_id));
      const cat = tags.filter((t) => t.startsWith("urn:tag:category:place:")).map((t) => t.split(":").pop());
      const access = tags.filter((t) => t.includes(":accessibility:"));
      const tod = tags.filter((t) => t.includes(":time_of_day_fit:")).map((t) => t.split(":").pop());
      const dist = loc?.location && e.location ? km(loc.location, e.location) : null;
      bump("hours", Boolean(pr.hours && Object.keys(pr.hours).length));
      bump("price_level", pr.price_level != null);
      bump("price_range", pr.price_range != null);
      bump("cost_description", Boolean(pr.cost_description));
      bump("accessibility_tag", access.length > 0);
      bump("wheelchair_entrance", access.some((t) => t.endsWith("wheelchair_accessible_entrance")));
      bump("time_of_day_tag", tod.length > 0);
      bump("keywords", Boolean(pr.keywords?.length));
      bump("website", Boolean(pr.website));
      bump("image", Boolean(pr.images?.length || pr.image));
      bump("description", Boolean(pr.description || pr.short_description || pr.overall_description));
      bump("customer_demographics_description", Boolean(pr.customer_demographics_description));
      bump("explainability", Boolean(e.query?.explainability));
      bump("is_closed_false", pr.is_closed === false);
      out[p.id].tiers[tier].places.push({
        id: e.entity_id, name: e.name, affinity: e.query?.affinity, categories: cat, access, tod,
        km: dist && +dist.toFixed(2), address: pr.address, explain: e.query?.explainability,
      });
      const why = (e.query?.explainability?.["signal.interests.entities"] ?? [])
        .map((x) => `${entities[p.id].find((r) => r.top?.id === x.entity_id)?.query ?? x.entity_id}=${x.score.toFixed(2)}`).join(" ");
      console.log(`    ${(e.query?.affinity ?? 0).toFixed(3)} ${e.name} [${cat.slice(0, 3).join("/")}] ${dist ? dist.toFixed(1) + "km" : ""} access=${access.length} tod=${tod.join("/")} why: ${why}`);
    }
  }
}

// Filter behaviour checks on one profile.
const chi = entities.chicago.map((r) => r.top?.id).filter(Boolean).join(",");
const base = { "filter.type": "urn:entity:place", "signal.interests.entities": chi, "filter.location.query": "Logan Square, Chicago", take: 10 };
const checks = {
  hours_tuesday: await qloo("/v2/insights", { ...base, "filter.tags": TIERS.show_up.join(","), "filter.hours": "tuesday" }),
  wheelchair_intersection: await qloo("/v2/insights", { ...base, "filter.tags": `${C("book_store")},urn:tag:accessibility:place:wheelchair_accessible_entrance`, "operator.filter.tags": "intersection" }),
  no_category_filter: await qloo("/v2/insights", { ...base }),
  city_only: await qloo("/v2/insights", { ...base, "filter.location.query": "Chicago", "filter.tags": TIERS.show_up.join(",") }),
  neighborhood_radius0: await qloo("/v2/insights", { ...base, "filter.location.radius": 0, "filter.tags": TIERS.show_up.join(",") }),
  unknown_locality: await qloo("/v2/insights", { ...base, "filter.location.query": "Qwxzv Nowhere" }),
  score_given_list: await qloo("/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": chi, "filter.results.entities": "7FDE5B2B-5EDA-4981-871E-153B5991EE36,EE35F9FE-9052-4D59-982A-1B497BD07EE3" }),
};
console.log("\n=== filter checks (Chicago)");
for (const [k, r] of Object.entries(checks)) {
  const list = r.body.results?.entities ?? [];
  console.log(`  ${k}: ${r.status} n=${list.length} loc="${r.body.query?.localities?.filter?.[0]?.disambiguation ?? ""}" -> ${list.slice(0, 5).map((e) => `${e.name}(${(e.query?.affinity ?? 0).toFixed(2)})`).join(", ")} ${r.status !== 200 ? JSON.stringify(r.body).slice(0, 200) : ""}`);
}
out.checks = Object.fromEntries(Object.entries(checks).map(([k, r]) => [k, { status: r.status, n: r.body.results?.entities?.length ?? 0 }]));
out.coverage = Object.fromEntries(Object.entries(coverage).map(([k, [y, n]]) => [k, `${y}/${n}`]));
console.log("\n=== field coverage across all places", JSON.stringify(out.coverage, null, 1));
save("04-places.json", out);
console.log("STATS", JSON.stringify(stats));
