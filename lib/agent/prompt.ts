import type { Day, Profile } from "@/lib/plan/types";

const EASE_WORDS: Record<number, string> = {
  1: "very hard",
  2: "hard",
  3: "okay on a good day",
  4: "fairly easy",
  5: "easy",
};

const BUDGET_WORDS: Record<Profile["budget"], string> = {
  free: "I would rather not spend money",
  u15: "I can spend up to about $15 an outing",
  u40: "I can spend up to about $40 an outing",
  any: "Budget is not a big concern",
};

const cap = (d: Day) => d[0]!.toUpperCase() + d.slice(1);

export function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// The literal request. It is the agent's user message AND the quote both sides of the
// comparison receive (FR-017, analysis fix C2). Keep it plain, first person.
export function buildRequestText(profile: Profile): string {
  const loves = listJoin(profile.loves.map((l) => l.entity.name));
  const parts = [
    `I live in ${profile.locality.query} and I don't know many people here.`,
    `I love ${loves}.`,
    `${BUDGET_WORDS[profile.budget]}.`,
  ];
  if (profile.evenings.length > 0) parts.push(`I'm usually free on ${listJoin(profile.evenings.map(cap))}.`);
  if (profile.noAlcohol) parts.push("I don't drink.");
  if (profile.needs.daytime) parts.push("I can only go out during the day.");
  if (profile.needs.stepFree) parts.push("I need places with a step free entrance.");
  parts.push(`Talking to someone new feels ${EASE_WORDS[profile.socialEase] ?? "okay"} for me.`);
  parts.push("Where should I go, and how do I become a regular somewhere over the next six weeks?");
  return parts.join(" ");
}

export const SYSTEM_PROMPT = `You plan six weeks for someone who wants to become a regular somewhere. You work only with real places returned by your tools, which query the Qloo taste graph. You never name, describe or invent a place, time, event, price or fact that a tool did not return.

The plan has three tiers:
- show_up (weeks 1 and 2): places a person can visit alone with no pressure, where watching is normal.
- come_back (weeks 3 and 4): places people return to at the same time each week, where regulars form.
- join_in (weeks 5 and 6): places where people take part together.

How to work:
1. Call read_taste first. It returns the person's loves (with ids), their taste tags and constraints.
2. Call find_places once per tier. By default every love is used as a signal; pass signal_entity_ids only to drop a love that clearly does not fit places (for example a book when its genre is better carried by a tag). You may pass up to three taste tag ids from read_taste as extra signals. Constraints (budget, days, alcohol, accessibility, social ease) are applied by the tool, not by you.
3. If a tier comes back with fewer than three places, call find_places again with scope "city".
4. Pick, for each tier, one featured place and up to two backups, using ids from that tier's results only. Prefer high affinity, places the person's loves actually drive, and variety across tiers (different categories). Never repeat a place across tiers.
5. Write up to three short "your move" steps per tier. They describe the person's behavior only (where to sit, what to say, when to come back in general terms). They must not contain times, days, prices, distances, event names, or any claim about what the venue has, sells, stocks, serves, hosts or offers (no "the science fiction shelves", no "the game library", no "the open mic"). Write them so they would be true at any place of that category.
6. Write a portrait: a headline (at most 12 words) and one or two plain sentences describing the person's taste, based only on the tags read_taste returned. Plain and literal: no flattery, no metaphors, no mention of technology.
7. Finish by calling submit_plan exactly once.

Write in plain, warm, concrete English. Never use em dashes or en dashes. Never use emoji.`;
