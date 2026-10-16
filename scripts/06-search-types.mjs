// Probe 6: does /search accept a comma separated `types` list? (research.md section 5)
import { qloo, stats } from "./qloo.mjs";

const types = "urn:entity:artist,urn:entity:movie,urn:entity:tv_show,urn:entity:book,urn:entity:podcast,urn:entity:person";
for (const query of ["Dune", "Agatha Christie"]) {
  const r = await qloo("/search", { query, types, take: 6 });
  const rows = (r.body.results ?? []).map((e) => `${e.name} [${e.types?.join("|")}]`);
  console.log(`${query}: ${r.status} n=${rows.length}\n  ${rows.join("\n  ")}`);
}
console.log("STATS", JSON.stringify(stats));
