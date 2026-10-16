// Probe 2: find which place category tags exist (urn:tag:category:place:*) for the venue types we need.
import { qloo, save, stats } from "./qloo.mjs";
import { CATEGORY_QUERIES } from "./profiles.mjs";

const out = {};
for (const q of CATEGORY_QUERIES) {
  const r = await qloo("/v2/tags", { "filter.query": q, take: 25 });
  const tags = (r.body.results?.tags ?? []).filter((t) => t.parents?.some((p) => p.type === "urn:entity:place"));
  const categories = tags.filter((t) => t.type === "urn:tag:category:place").map((t) => `${t.id} (${t.name})`);
  out[q] = { status: r.status, categories, otherPlaceTagTypes: [...new Set(tags.map((t) => t.type))] };
  console.log(`${q.padEnd(18)} ${r.status} -> ${categories.join(", ") || "none"}`);
}
save("02-categories.json", out);
console.log("STATS", JSON.stringify(stats));
