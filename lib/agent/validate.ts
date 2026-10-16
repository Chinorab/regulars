import { DEFAULT_TIPS } from "@/content/tips";
import { DASH_RE } from "@/lib/text";
import type { Tier, TierKey } from "@/lib/plan/types";

// Tips must be general behavior. Anything that reads like a venue fact (times, prices, dates,
// distances, named events or formats) is dropped (FR-011, FR-006b).
const FACT_PATTERNS = [
  /\d/,
  /\$/,
  /\b(a\.?m\.?|p\.?m\.?)\b/i,
  /\b(open mic|trivia|quiz night|workshop|meetup|meet-up|event|events|hosts?|hosted|schedule|tickets?|cover charge|admission|entry fee|happy hour|lineup|line-up|showtime|reservation)\b/i,
  /\b(miles?|minutes?|blocks? away|km)\b/i,
  /\bthe [\w-]+( [\w-]+)? (shelves|section|aisle|menu|library|collection|stage|bar)\b/i,
  /\b(they|it) (has|have|offers?|hosts?|serves?|sells?|stocks?|runs?)\b/i,
  /\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b/i,
  DASH_RE,
];

export function isGeneralTip(tip: string): boolean {
  const t = tip.trim();
  if (t.length < 8 || t.length > 160) return false;
  return !FACT_PATTERNS.some((re) => re.test(t));
}

export function cleanTips(tier: TierKey, tips: string[] | undefined): string[] {
  const ok = (tips ?? []).map((t) => t.trim()).filter(isGeneralTip).slice(0, 3);
  return ok.length > 0 ? ok : DEFAULT_TIPS[tier];
}

export type ProposedTier = { tier: TierKey; featured_id?: string | null; backup_ids?: string[]; tips?: string[] };

// Build the final tiers from the model's proposal, keeping only ids that Qloo returned for
// that tier in this run. Gaps are filled by Qloo affinity order, never by invention.
export function assembleTiers(
  proposal: ProposedTier[],
  tierResults: Record<TierKey, string[]>,
  widened: Set<TierKey>,
  excluded: Set<string> = new Set(),
): { tiers: Tier[]; dropped: string[] } {
  const used = new Set<string>();
  const dropped: string[] = [];
  const order: TierKey[] = ["show_up", "come_back", "join_in"];
  const tiers: Tier[] = order.map((key) => {
    const allowed = tierResults[key].filter((id) => !excluded.has(id));
    const p = proposal.find((x) => x.tier === key);
    const pick = (id: string | null | undefined) => {
      if (!id) return null;
      if (!allowed.includes(id) || used.has(id)) {
        dropped.push(id);
        return null;
      }
      used.add(id);
      return id;
    };
    let featured = pick(p?.featured_id);
    const backups: string[] = [];
    for (const id of p?.backup_ids ?? []) {
      const ok = pick(id);
      if (ok && backups.length < 2) backups.push(ok);
    }
    for (const id of allowed) {
      if (featured && backups.length >= 2) break;
      if (used.has(id)) continue;
      used.add(id);
      if (!featured) featured = id;
      else backups.push(id);
    }
    return {
      key,
      featuredId: featured,
      backupIds: backups,
      tips: cleanTips(key, p?.tips),
      status: featured ? (widened.has(key) ? "widened" : "ok") : "empty",
      reconsider: false,
    };
  });
  return { tiers, dropped };
}
