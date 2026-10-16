import type { ConnectionPlan, Place, Profile } from "@/lib/plan/types";
import { fetchedText, joinWords, prettyTag } from "@/lib/plan/format";
import s from "./plan.module.css";

// Evidence for one place, exactly as Qloo returned it: affinity, which loves drove the match
// (feature.explainability) and what visitors mention (review keywords).
export function WhyYou({ place, profile, plan }: { place: Place; profile: Profile; plan: ConnectionPlan }) {
  const nameOf = (id: string) =>
    profile.loves.find((l) => l.entity.id === id)?.entity.name ?? plan.places[id]?.name ?? "A place you liked";
  const drivers = [...place.contributions].sort((a, b) => b.score - a.score);
  const silent = profile.loves.filter((l) => !place.contributions.some((c) => c.entityId === l.entity.id)).map((l) => l.entity.name);
  return (
    <section aria-label="Why you" className={s.why}>
      <h4 className={s.whyTitle}>Why you</h4>
      {drivers.slice(0, 3).map((c) => (
        <div key={c.entityId} className={s.whyItem}>
          <p className={s.who}>{nameOf(c.entityId)}</p>
          <p className={s.whyText}>
            Drove {Math.round(c.score * 100)}% of this match.
          </p>
        </div>
      ))}
      {place.affinity !== undefined ? (
        <div className={s.whyItem}>
          <p className={s.who}>Affinity {place.affinity.toFixed(2)}</p>
          <p className={s.whyText}>How strongly fans of what you love lean toward this place, on a 0 to 1 scale.</p>
        </div>
      ) : null}
      {place.reviewKeywords.length > 0 ? (
        <div className={s.whyItem}>
          <p className={s.who}>Visitors mention</p>
          <p className={s.whyText}>{joinWords(place.reviewKeywords.slice(0, 4).map((k) => prettyTag(k.name).toLowerCase()))}</p>
        </div>
      ) : null}
      {silent.length > 0 && drivers.length > 0 ? (
        <p className={s.whyText} style={{ color: "var(--ink-muted)", fontSize: 14 }}>
          {joinWords(silent)} did not move this match.
        </p>
      ) : null}
      <p className={s.whyFoot}>
        Signals from the <a href="https://www.qloo.com">Qloo</a> taste graph. {fetchedText(place.fetchedAt)}.
      </p>
    </section>
  );
}
