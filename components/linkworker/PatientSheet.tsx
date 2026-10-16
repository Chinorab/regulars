import { Mark } from "@/components/ui/Mark";
import { SHEET_COPY, type SheetLang } from "@/content/sheet";
import { isDaytime, weeklyHours } from "@/lib/plan/place";
import type { ConnectionPlan, Profile } from "@/lib/plan/types";

// Letter size, large print patient sheet (design/PatientSheet.dc.html). Facts are Qloo fields;
// anything Qloo does not list becomes "call ahead" (FR-020, FR-021).
export function PatientSheet({
  plan,
  profile,
  firstName,
  lang,
  worker,
  phone,
}: {
  plan: ConnectionPlan;
  profile: Profile;
  firstName: string;
  lang: SheetLang;
  worker: string;
  phone: string;
}) {
  const c = SHEET_COPY[lang];
  const date = new Date().toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="print-sheet" lang={lang}>
      <div className="sheet-top">
        <div className="sheet-brand">
          <Mark size={30} />
          <span>Regulars</span>
        </div>
        <p className="sheet-meta">{c.madeWith(worker.trim(), date)}</p>
      </div>
      <h1 className="sheet-title">{c.title(firstName.trim() || (lang === "es" ? "Hola" : "Hello"))}</h1>
      <p className="sheet-intro">{c.intro}</p>

      {plan.tiers.map((t) => {
        const p = t.featuredId ? plan.places[t.featuredId] : undefined;
        const hours = p ? weeklyHours(p, c.days, { closed: c.closed, to: c.to, sep: lang === "es" ? "; " : ". " }) : undefined;
        const tip = lang === "en" && t.tips[0] ? t.tips[0] : c.tier[t.key].tip;
        const access: string[] = [];
        if (p && profile.needs.stepFree) access.push(p.stepFree ? c.stepFreeYes : c.stepFreeUnknown);
        if (p && profile.needs.daytime && isDaytime(p) === undefined && !p.hours) access.push(c.daytimeUnknown);
        return (
          <section key={t.key} className="sheet-step">
            <div className="sheet-step-head">
              <span className="sheet-weeks">{c.tier[t.key].weeks}</span>
              <span className="sheet-verb">{c.tier[t.key].verb}</span>
            </div>
            {p ? (
              <div className="sheet-step-body">
                <p className="sheet-place">{p.name}</p>
                {p.address ? <p>{p.address}</p> : null}
                <p>{hours ? `${c.hours}: ${hours}.` : c.hoursMissing}</p>
                {access.length ? <p>{access.join(" ")}</p> : null}
                <p>
                  <strong>{c.tryThis}</strong> {tip}
                </p>
              </div>
            ) : (
              <div className="sheet-step-body">
                <p>{c.noPlace}</p>
              </div>
            )}
            <div className="sheet-visits">
              {[1, 2].map((n) => (
                <span key={n} className="sheet-visit">
                  <span className="sheet-box" aria-hidden />
                  {c.visit(n)}
                </span>
              ))}
            </div>
          </section>
        );
      })}

      <div className="sheet-foot">
        <p className="sheet-talk">{c.talk(worker.trim(), phone.trim())}</p>
        <p className="sheet-small">{c.footer}</p>
      </div>
    </div>
  );
}
