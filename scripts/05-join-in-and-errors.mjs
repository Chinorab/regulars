// Probe 5: widen "Join in" (participatory places), test weighted signals over POST,
// price_range format, and error behaviour (bad key, no signal, bad locality).
import { readFileSync } from "node:fs";
import { qloo, save, stats } from "./qloo.mjs";

const entities = JSON.parse(readFileSync(new URL("./output/01-entities.json", import.meta.url)));
const idsOf = (p) => entities[p].map((r) => r.top?.id).filter(Boolean);
const C = (s) => `urn:tag:category:place:${s}`;
const line = (k, r) => {
  const list = r.body.results?.entities ?? [];
  console.log(`  ${k}: ${r.status} n=${list.length} loc="${r.body.query?.localities?.filter?.[0]?.disambiguation ?? ""}" -> ${list.slice(0, 6).map((e) => `${e.name}(${(e.query?.affinity ?? 0).toFixed(2)})`).join(", ")} ${r.status !== 200 ? JSON.stringify(r.body).slice(0, 240) : ""}`);
  return list;
};

const out = {};
const JOIN_TAGS = [
  C("board_game_club"), C("game_store"), C("community_garden"), C("community_center"), C("art_studio"),
  C("pottery_classes"), C("dance_school"), C("rock_climbing_gym"), C("library"), C("cultural_center"),
  "urn:tag:activity_type:qloo:social_community", "urn:tag:ambience:qloo:community_focused", "urn:tag:offerings:place:event_space",
];
console.log("=== Join in widening");
for (const [p, loc] of [["austin", "East Austin, Austin"], ["chicago", "Logan Square, Chicago"], ["seattle", "Ballard, Seattle"]]) {
  const near = await qloo("/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": idsOf(p).join(","), "filter.location.query": loc, "filter.tags": JOIN_TAGS.join(","), take: 10 });
  const city = await qloo("/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": idsOf(p).join(","), "filter.location.query": loc.split(", ").pop(), "filter.tags": JOIN_TAGS.slice(0, 10).join(","), take: 10 });
  out[p] = { near: line(`${p} near`, near).map((e) => e.name), city: line(`${p} city categories only`, city).map((e) => e.name) };
}

console.log("\n=== Price range format (one place)");
const one = await qloo("/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": idsOf("chicago").join(","), "filter.location.query": "Logan Square, Chicago", "filter.tags": C("coffee_shop"), take: 2 });
for (const e of one.body.results?.entities ?? []) console.log(" ", e.name, JSON.stringify({ price_level: e.properties.price_level, price_range: e.properties.price_range, good_for: e.properties.good_for, kw: e.properties.keywords?.slice(0, 4) }));

console.log("\n=== Book signals alone for places (Seattle crime novels)");
line("books only", await qloo("/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": idsOf("seattle").slice(2).join(","), "filter.location.query": "Ballard, Seattle", "filter.tags": [C("book_store"), C("library")].join(","), "feature.explainability": "true", take: 5 }));

console.log("\n=== Tag signals for places (ambience from portrait)");
line("ambience tags", await qloo("/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.tags": "urn:tag:ambience:qloo:intimate,urn:tag:ambience:qloo:cozy", "signal.interests.entities": idsOf("seattle").join(","), "filter.location.query": "Ballard, Seattle", "filter.tags": [C("cafe"), C("book_store")].join(","), take: 5 }));

console.log("\n=== Errors");
const bad = await fetch("https://hackathon.api.qloo.com/v2/insights?filter.type=urn:entity:place", { headers: { "X-Api-Key": "invalid" } });
console.log("  bad key:", bad.status, (await bad.text()).slice(0, 160));
line("no signal, no filter", await qloo("/v2/insights", { "filter.type": "urn:entity:place" }));
line("bad tag", await qloo("/v2/insights", { "filter.type": "urn:entity:place", "filter.tags": "indie folk", "filter.location.query": "Austin" }));
line("signal.location.query bad", await qloo("/v2/insights", { "filter.type": "urn:entity:place", "signal.location.query": "Qwxzv Nowhere", "signal.interests.entities": idsOf("austin")[0] }));
line("filter.location.query typo", await qloo("/v2/insights", { "filter.type": "urn:entity:place", "filter.location.query": "Logn Sqare, Chicgo", "signal.interests.entities": idsOf("chicago")[0], take: 3 }));
line("search gibberish", await qloo("/search", { query: "zzqqxx blorf", take: 3 }));

save("05-join-errors.json", out);
console.log("STATS", JSON.stringify(stats));
