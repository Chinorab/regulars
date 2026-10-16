import type { LatLon } from "@/lib/plan/distance";
import { formatMiles, kmBetween } from "@/lib/plan/distance";

// Where the place sits relative to the neighborhood center, from Qloo coordinates.
// A diagram with distance rings, not a street map: nothing here is invented.
export function DistanceDiagram({
  center,
  place,
  placeName,
  hoodName,
  className,
}: {
  center?: LatLon;
  place?: LatLon;
  placeName: string;
  hoodName: string;
  className?: string;
}) {
  if (!center || !place) return null;
  const km = kmBetween(center, place);
  const W = 400;
  const H = 240;
  const cx = W / 2;
  const cy = H / 2;
  const radiusKm = Math.max(1.2, km * 1.25);
  const scale = (H / 2 - 22) / radiusKm;
  const dx = (place.lon - center.lon) * Math.cos((center.lat * Math.PI) / 180) * 111.32;
  const dy = (place.lat - center.lat) * 110.57;
  const px = cx + dx * scale;
  const py = cy - dy * scale;
  const ringMi = radiusKm * 0.621371 > 3 ? [1, 3] : radiusKm * 0.621371 > 1.2 ? [0.5, 1] : [0.25, 0.5];
  const dir = `${dy >= 0 ? "north" : "south"}${Math.abs(dx) > Math.abs(dy) / 2 ? (dx >= 0 ? " east" : " west") : ""}`;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${placeName} is about ${formatMiles(km)} ${dir} of the center of ${hoodName}.`}
      preserveAspectRatio="xMidYMid slice"
    >
      {ringMi.map((mi) => {
        const r = (mi / 0.621371) * scale;
        return (
          <g key={mi}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--map-line)" strokeWidth={6} />
            <text x={cx} y={cy - r - 6} fontSize={12} textAnchor="middle" fill="var(--ink-muted)" fontFamily="var(--font-body)">
              {mi} mi
            </text>
          </g>
        );
      })}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="4 5" />
      <circle cx={cx} cy={cy} r={7} fill="var(--ink)" />
      <text x={cx} y={cy + 24} fontSize={13} textAnchor="middle" fill="var(--ink)" fontFamily="var(--font-body)" fontWeight={600}>
        {hoodName}
      </text>
      <g transform={`translate(${px} ${py})`}>
        <path d="M0 0 C -10 -14 -14 -20 -14 -27 a14 14 0 0 1 28 0 c0 7 -4 13 -14 27z" fill="var(--clay)" />
        <circle cx={0} cy={-27} r={5} fill="var(--lamp)" />
      </g>
    </svg>
  );
}
