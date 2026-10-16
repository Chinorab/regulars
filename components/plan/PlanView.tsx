"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle, CircleNotch } from "@phosphor-icons/react";
import ui from "@/components/ui/ui.module.css";
import { Notice, Skeleton } from "@/components/ui/Notice";
import { planRequest, streamNdjson, type StreamEvent } from "@/lib/client/api";
import { loadMoves, loadPlan, loadProfile, saveMoves, savePlan } from "@/lib/plan/store";
import { constraintsLine } from "@/lib/plan/format";
import { TIER_META, type ConnectionPlan, type Profile, type TierKey } from "@/lib/plan/types";
import { PlaceCard } from "./PlaceCard";
import s from "./plan.module.css";

type Step = { label: string; tool: string; cacheHit?: boolean };

export function PlanView() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [plan, setPlan] = useState<ConnectionPlan | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [building, setBuilding] = useState(false);
  const [moves, setMoves] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const build = useCallback((p: Profile, extra?: { excludedPlaceIds?: string[]; addedSignalIds?: string[] }) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBuilding(true);
    setError(null);
    setSteps([]);
    void streamNdjson(
      "/api/plan",
      planRequest(p, extra),
      (e: StreamEvent) => {
        if (e.type === "step") setSteps((xs) => [...xs, e]);
        if (e.type === "plan") {
          savePlan(e.plan);
          setPlan(e.plan);
        }
        if (e.type === "error") setError({ code: e.code, message: e.message });
      },
      ctrl.signal,
    ).finally(() => {
      if (!ctrl.signal.aborted) setBuilding(false);
    });
  }, []);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setMoves(loadMoves());
    const existing = loadPlan();
    if (existing) setPlan(existing);
    else if (p) build(p);
    return () => abort.current?.abort();
  }, [build]);

  if (profile === undefined) return null;
  if (profile === null) {
    return (
      <main id="main" className={s.main}>
        <Notice title="No plan yet" action={<Link href="/start">Tell us what you love</Link>}>
          <p>Your plan is built from a few things you love and your neighborhood. It stays in this browser.</p>
        </Notice>
      </main>
    );
  }

  function toggleMove(key: string) {
    setMoves((m) => {
      const next = { ...m, [key]: !m[key] };
      saveMoves(next);
      return next;
    });
  }

  function swap(key: TierKey) {
    if (!plan) return;
    const tiers = plan.tiers.map((t) => {
      if (t.key !== key || !t.featuredId) return t;
      const [next, ...rest] = t.backupIds;
      if (!next) return t;
      return { ...t, featuredId: next, backupIds: rest, reconsider: false };
    });
    const old = plan.tiers.find((t) => t.key === key);
    if (!old?.backupIds.length) {
      setNotice("No other matches are ready for this step. Changing your constraints or neighborhood will find new ones.");
      return;
    }
    const updated: ConnectionPlan = {
      ...plan,
      tiers,
      excludedPlaceIds: old.featuredId ? [...plan.excludedPlaceIds, old.featuredId] : plan.excludedPlaceIds,
      updatedAt: new Date().toISOString(),
    };
    savePlan(updated);
    setPlan(updated);
    setNotice(null);
  }

  const first = plan?.tiers.findIndex((t) => t.featuredId) ?? 0;

  return (
    <main id="main" className={s.main}>
      <section className={s.intro}>
        <h1 className={`${s.title} enter`}>Your six weeks in {profile.locality.name}.</h1>
        <p className={`${s.sub} enter`} style={{ ["--i" as string]: 1 }}>
          {constraintsLine(profile)} <Link href="/start">Change</Link>
        </p>
        {profile.sample ? <p className={s.sample}>Sample profile. Every place below was looked up live.</p> : null}
      </section>

      {error ? (
        <div style={{ marginBottom: 48 }}>
          <Notice
            tone="error"
            title={error.code === "rate_limited" ? "Please wait a moment" : "We could not build your plan"}
            action={
              <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => build(profile)}>
                Try again
              </button>
            }
          >
            <p>{error.message}</p>
          </Notice>
        </div>
      ) : null}

      {!plan && !error ? <BuildingState steps={steps} hood={profile.locality.name} /> : null}

      {plan ? (
        <>
          <nav aria-label="Plan timeline" className={`${s.timeline} enter`} style={{ ["--i" as string]: 2 }}>
            {plan.tiers.map((t, i) => (
              <a key={t.key} href={`#${t.key}`} className={`${s.tl} ${i === first ? s.tlNow : ""}`}>
                <span className={s.tlWeeks}>{TIER_META[t.key].weeks}</span>
                <span className={s.tlVerb}>{TIER_META[t.key].verb}</span>
                <span className={s.tlPlace}>{t.featuredId ? plan.places[t.featuredId]?.name : "No match yet"}</span>
              </a>
            ))}
          </nav>

          {notice ? (
            <div style={{ margin: "8px 0 24px" }} role="status">
              <Notice title="Nothing to swap in yet">
                <p>{notice}</p>
              </Notice>
            </div>
          ) : null}

          {plan.tiers.map((t) => {
            const place = t.featuredId ? plan.places[t.featuredId] : undefined;
            return (
              <section key={t.key} id={t.key} className={`${s.tier} reveal`} aria-labelledby={`h-${t.key}`}>
                <div className={s.tierHead}>
                  <p className={s.weeks}>{TIER_META[t.key].weeks}</p>
                  <h2 id={`h-${t.key}`} className={`${s.verb} ${t.key === "join_in" ? s.verbAccent : ""}`}>
                    {TIER_META[t.key].verb}
                  </h2>
                  <p className={s.goal}>{TIER_META[t.key].goal}</p>
                  {t.status === "widened" ? (
                    <p className={s.sample}>Few matches nearby, so this one comes from across the {profile.city} area.</p>
                  ) : null}
                </div>
                {place ? (
                  <PlaceCard
                    place={place}
                    tier={t}
                    plan={plan}
                    profile={profile}
                    moves={moves}
                    onToggleMove={toggleMove}
                    onSwap={() => swap(t.key)}
                  />
                ) : (
                  <div style={{ flex: "999 1 640px", minWidth: 0 }}>
                    <Notice
                      title="No place matched every constraint"
                      action={
                        <Link className={`${ui.btn} ${ui.ghost}`} href="/start">
                          Relax a constraint
                        </Link>
                      }
                    >
                      <p>
                        Qloo did not return a {TIER_META[t.key].verb.replace(".", "").toLowerCase()} place in {profile.city} that fits
                        your days, budget and preferences. We would rather show nothing than guess. Allowing more days or a wider budget
                        usually helps.
                      </p>
                    </Notice>
                  </div>
                )}
              </section>
            );
          })}

          <section className={`${s.outro} reveal`}>
            <p className={s.outroText}>After each visit, tell us how it went. The plan follows you.</p>
            <div className={s.outroActions}>
              <Link href="/checkin" className={`${ui.btn} ${ui.primary}`}>
                Check In
                <ArrowRight size={18} weight="bold" aria-hidden />
              </Link>
              <Link href="/compare" className={s.textLink}>
                How this plan was made
              </Link>
            </div>
          </section>
        </>
      ) : null}
      {building && plan ? <p className={s.sample}>Updating your plan</p> : null}
    </main>
  );
}

function BuildingState({ steps, hood }: { steps: Step[]; hood: string }) {
  return (
    <section className={s.building} aria-live="polite" aria-busy="true">
      <div>
        <h2 style={{ fontSize: "var(--text-h3)", letterSpacing: "var(--tracking-h3)", marginBottom: 16 }}>
          Finding places near {hood}
        </h2>
        <ol className={s.steps}>
          {steps.map((st, i) => {
            const active = i === steps.length - 1;
            return (
              <li key={`${st.label}-${i}`} className={`${s.step} ${active ? s.stepActive : ""}`}>
                {active ? (
                  <CircleNotch className={`${s.stepIcon} ${s.spin}`} aria-hidden />
                ) : (
                  <CheckCircle className={s.stepIcon} weight="fill" aria-hidden />
                )}
                <span>
                  {st.label}
                  {st.cacheHit ? <span className={s.cached}>from cache</span> : null}
                </span>
              </li>
            );
          })}
          {steps.length === 0 ? (
            <li className={`${s.step} ${s.stepActive}`}>
              <CircleNotch className={`${s.stepIcon} ${s.spin}`} aria-hidden />
              <span>Starting</span>
            </li>
          ) : null}
        </ol>
        <p className={s.sample} style={{ marginTop: 16 }}>
          This usually takes 15 to 40 seconds. Every place comes from the Qloo taste graph.
        </p>
      </div>
      <div className={s.ghostCards} aria-hidden>
        <Skeleton height={220} radius={14} />
        <Skeleton height={28} width="60%" />
        <Skeleton height={18} width="40%" />
      </div>
    </section>
  );
}
