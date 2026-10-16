import type { PlaceEntity } from "@/lib/qloo/schemas";
import { ACCESS_STEP_FREE, DRINKING_SUFFIXES } from "@/lib/qloo/categories";
import { kmBetween, type LatLon } from "./distance";
import type { Day, Place } from "./types";

const tagId = (t: string | { tag_id?: string; id?: string }) => (typeof t === "string" ? t : (t.tag_id ?? t.id ?? ""));

// Project a raw Qloo place into the display record. Only fields present in the payload are set.
export function toPlace(e: PlaceEntity, fetchedAt: string, center?: LatLon): Place {
  const tags = e.tags.map(tagId).filter(Boolean);
  const categories = unique(
    tags.filter((t) => t.startsWith("urn:tag:category:place:")).map((t) => t.slice("urn:tag:category:place:".length)),
  );
  const genres = tags.filter((t) => t.startsWith("urn:tag:genre:place:")).map((t) => t.split(":").pop() ?? "");
  const p = e.properties ?? {};
  const imageUrl = p.images?.[0]?.url ?? p.image?.url ?? undefined;
  const loc = e.location?.lat !== undefined && e.location?.lon !== undefined ? { lat: e.location.lat, lon: e.location.lon } : undefined;
  return {
    id: e.entity_id,
    name: e.name,
    categories,
    address: p.address ?? undefined,
    neighborhood: p.geocode?.name ?? undefined,
    website: p.website ?? undefined,
    phone: p.phone ?? undefined,
    imageUrl,
    description: p.short_description ?? p.description ?? undefined,
    hours: p.hours ?? undefined,
    priceLevel: p.price_level ?? undefined,
    reviewKeywords: (p.keywords ?? []).slice().sort((a, b) => b.count - a.count).slice(0, 6),
    timeOfDay: unique(tags.filter((t) => t.includes(":time_of_day_fit:")).map((t) => t.split(":").pop() ?? "")),
    // true when Qloo tags the entrance as accessible, undefined when Qloo says nothing
    stepFree: tags.includes(ACCESS_STEP_FREE) ? true : undefined,
    barLike: [...categories, ...genres].some((c) => DRINKING_SUFFIXES.includes(c)),
    affinity: e.query?.affinity,
    contributions: (e.query?.explainability?.["signal.interests.entities"] ?? []).map((x) => ({
      entityId: x.entity_id,
      score: x.score,
    })),
    km: center && loc ? Math.round(kmBetween(center, loc) * 100) / 100 : undefined,
    location: loc,
    fetchedAt,
  };
}

export function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function matchesTier(place: Place, tierCategories: string[]): boolean {
  const wanted = tierCategories.map((c) => c.split(":").pop());
  return place.categories.some((c) => wanted.includes(c));
}

export function openOnDay(place: Place, day: Day): boolean | undefined {
  const slots = place.hours?.[day];
  if (!place.hours) return undefined;
  if (!slots || slots.length === 0) return false;
  return slots.some((s) => !s.closed);
}

// "T12:00:00" -> "12 pm"
export function formatTime(t?: string): string | undefined {
  if (!t) return undefined;
  const m = /T?(\d{2}):(\d{2})/.exec(t);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = m[2];
  const suffix = h >= 12 && h < 24 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === "00" ? `${h12} ${suffix}` : `${h12}:${min} ${suffix}`;
}

export function hoursFor(place: Place, day: Day): string | undefined {
  const slots = place.hours?.[day];
  if (!slots) return undefined;
  if (slots.length === 0 || slots.every((s) => s.closed)) return "Closed";
  return slots
    .filter((s) => !s.closed)
    .map((s) => `${formatTime(s.opens) ?? "?"} to ${formatTime(s.closes) ?? "?"}`)
    .join(", ");
}

export function isDaytime(place: Place): boolean | undefined {
  if (place.timeOfDay.length === 0) return undefined;
  return place.timeOfDay.some((t) => ["morning", "midday", "afternoon", "early_morning"].includes(t));
}

export function onlyLateNight(place: Place): boolean {
  return place.timeOfDay.length > 0 && place.timeOfDay.every((t) => t === "late_night");
}

// "Mon to Fri 10 am to 7 pm. Sat 11 am to 5 pm. Sun closed." built only from Qloo hours.
export function weeklyHours(
  place: Place,
  labels: Record<Day, string>,
  words: { closed: string; to: string; sep?: string } = { closed: "closed", to: "to" },
): string | undefined {
  if (!place.hours) return undefined;
  const order: Day[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const text = (d: Day) => {
    const slots = place.hours?.[d];
    if (!slots) return null;
    const open = slots.filter((s) => !s.closed);
    if (open.length === 0) return words.closed;
    return open.map((s) => `${formatTime(s.opens) ?? "?"} ${words.to} ${formatTime(s.closes) ?? "?"}`).join(", ");
  };
  const groups: { from: Day; to: Day; value: string }[] = [];
  for (const d of order) {
    const v = text(d);
    if (v === null) continue;
    const last = groups[groups.length - 1];
    if (last && last.value === v && order.indexOf(d) === order.indexOf(last.to) + 1) last.to = d;
    else groups.push({ from: d, to: d, value: v });
  }
  if (groups.length === 0) return undefined;
  return groups
    .map((g) => `${labels[g.from]}${g.from !== g.to ? ` ${words.to} ${labels[g.to]}` : ""} ${g.value}`)
    .join(words.sep ?? ". ");
}
