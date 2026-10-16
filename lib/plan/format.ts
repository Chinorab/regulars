import { CATEGORY_LABEL } from "@/lib/qloo/categories";
import type { Day, Profile } from "./types";

// Display helpers. They only reformat Qloo values; they never add facts.

export function prettyTag(name: string): string {
  const t = name.replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function categoryLabel(slug: string): string {
  return CATEGORY_LABEL[slug] ?? prettyTag(slug.replace(/_/g, " "));
}

export function kindLine(categories: string[]): string {
  const known = categories.filter((c) => CATEGORY_LABEL[c]);
  const pick = (known.length ? known : categories).slice(0, 2).map(categoryLabel);
  return pick.join(" and ");
}

export const DAY_SHORT: Record<Day, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export function capDay(d: Day) {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function joinWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function constraintsLine(p: Profile): string {
  const parts: string[] = [];
  if (p.evenings.length) parts.push(`${joinWords(p.evenings.map(capDay))}.`);
  const budget = { free: "Free if possible.", u15: "Under $15 a visit.", u40: "Under $40 a visit.", any: "" }[p.budget];
  if (budget) parts.push(budget);
  if (p.noAlcohol) parts.push("No bars or breweries.");
  if (p.needs.daytime) parts.push("Daytime only.");
  if (p.needs.stepFree) parts.push("Step free entrance.");
  return parts.join(" ");
}

export function priceText(level?: number): string {
  if (!level) return "Price not listed";
  return `${"$".repeat(level)} on Qloo's price scale`;
}

export function fetchedText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `Taste data fetched ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function mapsUrl(name: string, address?: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ? `${name}, ${address}` : name)}`;
}

// Round robin across tag subtypes so one family (often music genres) does not crowd out the rest.
export function interleaveBySubtype<T extends { kind: string }>(tags: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const t of tags) groups.set(t.kind, [...(groups.get(t.kind) ?? []), t]);
  const order = ["urn:tag:genre:qloo", "urn:tag:genre:music", "urn:tag:keyword:qloo"];
  const keys = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  const out: T[] = [];
  for (let i = 0; out.length < tags.length; i++) for (const k of keys) { const g = groups.get(k)!; if (g[i]) out.push(g[i]!); }
  return out;
}
