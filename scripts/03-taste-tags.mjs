// Probe 3: which taste tags come back for a profile (for the taste portrait), and which tag types.
import { readFileSync } from "node:fs";
import { qloo, save, stats } from "./qloo.mjs";

const entities = JSON.parse(readFileSync(new URL("./output/01-entities.json", import.meta.url)));
const out = {};
for (const [id, rows] of Object.entries(entities)) {
  const ids = rows.map((r) => r.top?.id).filter(Boolean).join(",");
  const r = await qloo("/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": ids, take: 30 });
  const tags = r.body.results?.tags ?? r.body.results?.entities ?? [];
  const byType = {};
  for (const t of tags) (byType[t.subtype ?? t.type] ??= []).push(`${t.name} (${(t.query?.affinity ?? 0).toFixed(2)})`);
  out[id] = { status: r.status, ms: r.ms, count: tags.length, byType, sampleKeys: tags[0] && Object.keys(tags[0]) };
  console.log(`\n${id} ${r.status} ${r.ms}ms ${tags.length} tags; keys=${out[id].sampleKeys}`);
  for (const [type, names] of Object.entries(byType)) console.log(`  ${type}: ${names.slice(0, 8).join(", ")}`);
}
save("03-taste-tags.json", out);
console.log("STATS", JSON.stringify(stats));
