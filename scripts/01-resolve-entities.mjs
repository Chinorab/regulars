// Probe 1: resolve each sample profile's loves through /search, with and without a type filter.
import { qloo, save, stats } from "./qloo.mjs";
import { PROFILES } from "./profiles.mjs";

const out = {};
for (const p of PROFILES) {
  out[p.id] = [];
  for (const love of p.loves) {
    const typed = await qloo("/search", { query: love.query, types: love.type, take: 3 });
    const untyped = await qloo("/search", { query: love.query, take: 5 });
    const top = typed.body.results?.[0];
    if (typed.status !== 200) console.log("   status", typed.status, JSON.stringify(typed.body).slice(0, 200));
    const row = {
      query: love.query,
      type: love.type,
      status: typed.status,
      ms: typed.ms,
      top: top && {
        id: top.entity_id,
        name: top.name,
        types: top.types,
        hasImage: Boolean(top.properties?.image?.url),
        tagCount: top.tags?.length ?? 0,
        tagTypes: [...new Set((top.tags ?? []).map((t) => t.type))],
        popularity: top.popularity,
      },
      untypedTop5: (untyped.body.results ?? []).map((r) => `${r.name} [${r.types?.join("|")}]`),
    };
    out[p.id].push(row);
    console.log(`${p.id} | ${love.query} -> ${row.top ? `${row.top.name} ${row.top.id} img=${row.top.hasImage} tags=${row.top.tagCount}` : "NO MATCH"} (${typed.ms}ms)`);
    console.log(`   untyped: ${row.untypedTop5.join("; ")}`);
  }
}
save("01-entities.json", out);
console.log("STATS", JSON.stringify(stats));
