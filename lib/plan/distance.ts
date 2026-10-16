export type LatLon = { lat: number; lon: number };

// Great circle distance in kilometers (haversine).
export function kmBetween(a: LatLon, b: LatLon): number {
  const R = 6371;
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// US audience: show miles, one decimal.
export function formatMiles(km: number): string {
  const mi = km * 0.621371;
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}
