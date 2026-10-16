"use client";

import { ArrowsClockwise, Clock, CurrencyDollar, MapPin, Wheelchair, Globe, ArrowUpRight, Check } from "@phosphor-icons/react";
import type { ConnectionPlan, Place, Profile, Tier } from "@/lib/plan/types";
import { hoursFor } from "@/lib/plan/place";
import { formatMiles } from "@/lib/plan/distance";
import { capDay, kindLine, mapsUrl, priceText } from "@/lib/plan/format";
import { DistanceDiagram } from "./DistanceDiagram";
import { WhyYou } from "./WhyYou";
import { VenuePhoto } from "./VenuePhoto";
import ui from "@/components/ui/ui.module.css";
import s from "./plan.module.css";

export function PlaceCard({
  place,
  tier,
  plan,
  profile,
  moves,
  onToggleMove,
  onSwap,
  swapping,
}: {
  place: Place;
  tier: Tier;
  plan: ConnectionPlan;
  profile: Profile;
  moves: Record<string, boolean>;
  onToggleMove: (key: string) => void;
  onSwap: () => void;
  swapping?: boolean;
}) {
  const hood = profile.locality.name;
  const hours = profile.evenings
    .map((d) => ({ d, h: hoursFor(place, d) }))
    .filter((x) => x.h !== undefined);
  return (
    <article aria-label={place.name} className={s.card}>
      <div className={s.photo}>
        <VenuePhoto src={place.imageUrl} alt={`Photo of ${place.name}`} fallbackClass={s.noPhoto} />
      </div>
      <div className={s.body}>
        <div className={s.nameRow}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h3 className={s.name}>{place.name}</h3>
            <p className={s.kind}>{kindLine(place.categories)}</p>
          </div>
          <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={onSwap} disabled={swapping}>
            <ArrowsClockwise size={18} aria-hidden />
            {swapping ? "Finding another" : "Swap Place"}
          </button>
        </div>

        <ul className={s.facts}>
          <li>
            <Clock size={20} color="var(--clay)" aria-hidden />
            <span>
              {hours.length > 0
                ? hours.map((x) => `${capDay(x.d)}: ${x.h}`).join(". ")
                : place.hours
                  ? "Hours listed with Qloo, check before you go"
                  : <span className={s.factMuted}>Hours not listed, check before you go</span>}
            </span>
          </li>
          <li>
            <CurrencyDollar size={20} color="var(--clay)" aria-hidden />
            <span className={place.priceLevel ? undefined : s.factMuted}>{priceText(place.priceLevel)}</span>
          </li>
          <li>
            <MapPin size={20} color="var(--clay)" aria-hidden />
            <span>
              {place.address ?? place.neighborhood ?? "Address not listed"}
              {place.km !== undefined ? `. ${formatMiles(place.km)} from the center of ${hood}` : ""}
            </span>
          </li>
          {profile.needs.stepFree || place.stepFree ? (
            <li>
              <Wheelchair size={20} color="var(--clay)" aria-hidden />
              <span className={place.stepFree ? undefined : s.factMuted}>
                {place.stepFree ? "Wheelchair accessible entrance listed" : "Entrance access not listed. Call ahead to check"}
              </span>
            </li>
          ) : null}
          {place.website ? (
            <li>
              <Globe size={20} color="var(--clay)" aria-hidden />
              <a href={place.website} rel="noopener noreferrer" target="_blank" style={{ color: "var(--ink)", overflowWrap: "anywhere" }}>
                {place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            </li>
          ) : null}
        </ul>

        <div className={s.pair}>
          <div className={s.mapCol}>
            <DistanceDiagram className={s.diagram} center={profile.locality.center} place={place.location} placeName={place.name} hoodName={hood} />
            <a className={s.mapLink} href={mapsUrl(place.name, place.address)} target="_blank" rel="noopener noreferrer">
              Open in Maps
              <ArrowUpRight size={16} weight="bold" aria-hidden />
            </a>
          </div>
          <WhyYou place={place} profile={profile} plan={plan} />
        </div>

        <div className={s.moves}>
          <h4 className={s.movesTitle}>Your move</h4>
          <p className={s.movesNote}>General suggestions, not details about this place.</p>
          <ul className={s.moveList}>
            {tier.tips.map((tip, i) => {
              const key = `${tier.key}:${place.id}:${i}`;
              const done = Boolean(moves[key]);
              return (
                <li key={key}>
                  <button type="button" className={s.move} aria-pressed={done} onClick={() => onToggleMove(key)}>
                    <span className={s.tick} aria-hidden>
                      {done ? <Check size={13} weight="bold" /> : null}
                    </span>
                    {tip}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {tier.backupIds.length > 0 ? (
          <p className={s.backups}>
            {tier.backupIds.length === 1 ? "One more match" : `${tier.backupIds.length} more matches`} ready if you swap:{" "}
            {tier.backupIds.map((id) => plan.places[id]?.name).filter(Boolean).join(", ")}.
          </p>
        ) : null}
      </div>
    </article>
  );
}
