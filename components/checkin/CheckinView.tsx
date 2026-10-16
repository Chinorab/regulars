"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, Heart, MinusCircle, XCircle } from "@phosphor-icons/react";
import ui from "@/components/ui/ui.module.css";
import { Notice } from "@/components/ui/Notice";
import { ClientApiError } from "@/lib/client/api";
import { addCheckin, loadCheckins, loadPlan, loadProfile, savePlan } from "@/lib/plan/store";
import { applyCheckin, mergeTiers, TIER_ORDER, type Choice } from "@/lib/plan/checkin";
import { TIER_META, type ConnectionPlan, type Place, type Profile, type TierChange, type TierKey } from "@/lib/plan/types";
import s from "./checkin.module.css";

const OPTIONS: { id: Choice; label: string; hint: string; Icon: typeof Heart }[] = [
  { id: "back", label: "I'd go back", hint: "Felt right, or close to it", Icon: Heart },
  { id: "okay", label: "It was okay", hint: "Not sure yet", Icon: MinusCircle },
  { id: "not", label: "Not for me", hint: "Wrong room, wrong crowd", Icon: XCircle },
];

const ORDINAL = ["first", "second", "third", "fourth", "fifth"];

export function CheckinView() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [plan, setPlan] = useState<ConnectionPlan | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice>("back");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ changes: TierChange[]; plan: ConnectionPlan } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();

  useEffect(() => {
    const p = loadProfile();
    const pl = loadPlan();
    setProfile(p);
    setPlan(pl);
    if (pl) {
      const done = new Set(loadCheckins().map((c) => c.placeId));
      const first = pl.tiers.find((t) => t.featuredId && !done.has(t.featuredId)) ?? pl.tiers.find((t) => t.featuredId);
      setPlaceId(first?.featuredId ?? null);
    }
  }, []);

  const preview = useMemo(() => (plan && placeId ? applyCheckin(plan, placeId, choice) : null), [plan, placeId, choice]);

  if (profile === undefined) return null;
  if (!profile || !plan || !placeId) {
    return (
      <main id="main" className={s.main}>
        <Notice title="Nothing to check in yet" action={<Link href="/plan">See my plan</Link>}>
          <p>Once you have a plan and have visited one of its places, come back here to say how it went.</p>
        </Notice>
      </main>
    );
  }

  const place = plan.places[placeId];
  const tier = plan.tiers.find((t) => t.featuredId === placeId);
  const visits = loadCheckins().filter((c) => c.placeId === placeId).length;
  const nameOf = (id?: string | null) => (id ? (plan.places[id]?.name ?? saved?.plan.places[id]?.name) : undefined);

  async function save() {
    if (!preview || !plan || !profile || !placeId) return;
    setSaving(true);
    setError(null);
    let next = preview.plan;
    let changes = preview.changes;
    const needs: TierKey[] = [...preview.server.refill, ...preview.server.refresh];
    try {
      if (needs.length > 0) {
        const keep = next.tiers.filter((t) => !needs.includes(t.key)).flatMap((t) => [t.featuredId, ...t.backupIds]).filter(Boolean);
        const liked = preview.server.addedSignalIds.map((id) => plan.places[id]).filter(Boolean) as Place[];
        const res = await fetch("/api/replan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            profile,
            tiers: needs,
            excludedPlaceIds: next.excludedPlaceIds,
            addedSignalIds: preview.server.addedSignalIds,
            keepIds: keep,
            knownPlaces: liked,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new ClientApiError(json);
        const merged = mergeTiers(next, json.updates, json.places);
        next = merged.plan;
        changes = changes.filter((c) => !needs.includes(c.tierKey)).concat(merged.changes);
        changes.sort((a, b) => TIER_ORDER.indexOf(a.tierKey) - TIER_ORDER.indexOf(b.tierKey));
      }
      savePlan(next);
      addCheckin({ placeId, tierKey: tier?.key ?? "show_up", choice, note: note.trim() || undefined, at: new Date().toISOString() });
      setPlan(next);
      setSaved({ changes, plan: next });
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "We could not update the plan right now. Your answer was not saved.");
    } finally {
      setSaving(false);
    }
  }

  const copy = {
    back: {
      title: "Good. Same place next time.",
      body: `Going back is the whole point. When you save, ${place?.name ?? "this place"} becomes a new taste signal and the next steps are refreshed with places its regulars also like.`,
    },
    okay: {
      title: "Fair enough. One more try.",
      body: "Second visits often feel easier than first ones. It stays in your plan for one more visit. If it still feels flat, choose Not for me next time.",
    },
    not: {
      title: "Thanks for trying it.",
      body: "That counts. We swap it for the next best match for the same step and never suggest it again.",
    },
  }[choice];

  const describe = (c: TierChange) => {
    if (c.kind === "replaced") return c.toId ? `New: ${nameOf(c.toId)}` : "Looking for a new match";
    if (c.kind === "reconsider") return "One more visit, then you decide";
    if (c.kind === "refreshed") return c.toId ? `Refreshed: ${nameOf(c.toId)}` : "No new match found";
    return "Unchanged";
  };

  const rows = (saved?.changes ?? preview?.changes ?? []).map((c) => {
    const pending = !saved && preview?.server.refresh.includes(c.tierKey);
    const current = (saved?.plan ?? plan).tiers.find((t) => t.key === c.tierKey);
    return {
      key: c.tierKey,
      weeks: TIER_META[c.tierKey].weeks,
      place: c.kind === "replaced" || c.kind === "refreshed" ? nameOf(c.fromId) : nameOf(current?.featuredId) ?? "No match yet",
      note: pending ? "Will be refreshed when you save" : describe(c),
      hi: pending || c.kind !== "unchanged",
    };
  });
  for (const k of preview?.server.refresh ?? []) {
    if (!rows.some((r) => r.key === k)) {
      const t = plan.tiers.find((x) => x.key === k);
      rows.push({ key: k, weeks: TIER_META[k].weeks, place: nameOf(t?.featuredId) ?? "No match yet", note: "Will be refreshed when you save", hi: true });
    }
  }
  rows.sort((a, b) => TIER_ORDER.indexOf(a.key) - TIER_ORDER.indexOf(b.key));

  return (
    <main id="main" className={s.main}>
      <div className={s.head}>
        <p className={`${s.kicker} enter`}>
          {tier ? TIER_META[tier.key].weeks : ""}, your {ORDINAL[visits] ?? "next"} visit
        </p>
        <h1 className={`${s.title} enter`} style={{ ["--i" as string]: 1 }}>
          How was {place?.name ?? "it"}?
        </h1>
      </div>

      {!saved ? (
        <>
          <fieldset className={s.fieldset}>
            <legend className={s.legend}>Which place did you visit?</legend>
            <div className={s.which}>
              {plan.tiers
                .filter((t) => t.featuredId)
                .map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={ui.toggle}
                    aria-pressed={t.featuredId === placeId}
                    onClick={() => setPlaceId(t.featuredId)}
                  >
                    {plan.places[t.featuredId!]?.name}
                  </button>
                ))}
            </div>
          </fieldset>

          <fieldset className={`${s.fieldset} enter`} style={{ ["--i" as string]: 2 }}>
            <legend className={s.legend}>How did it go</legend>
            <div className={s.choices}>
              {OPTIONS.map(({ id, label, hint, Icon }) => (
                <button key={id} type="button" className={s.choice} aria-pressed={choice === id} onClick={() => setChoice(id)}>
                  <Icon size={30} weight={choice === id ? "fill" : "regular"} aria-hidden />
                  <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span className={s.choiceLabel}>{label}</span>
                    <span className={s.choiceHint}>{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}

      <section aria-live="polite" aria-labelledby="result" className={s.result}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="result" className={s.resultTitle}>
            {saved ? "Saved. Here is your plan now." : copy.title}
          </h2>
          {!saved ? <p className={s.resultBody}>{copy.body}</p> : null}
        </div>
        <ol className={s.rows}>
          {rows.map((r) => (
            <li key={r.key} className={`${s.rowItem} ${r.hi ? s.rowHi : ""}`}>
              <span className={s.rowWeeks}>{r.weeks}</span>
              <span className={s.rowPlace}>{r.place}</span>
              <span className={s.rowNote}>{r.note}</span>
            </li>
          ))}
        </ol>
      </section>

      {!saved ? (
        <>
          <div className={ui.field}>
            <label htmlFor={noteId} className={ui.label}>
              Anything you want to remember? <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>Optional, stays on this device</span>
            </label>
            <textarea
              id={noteId}
              className={`${ui.input} ${s.textarea}`}
              name="note"
              rows={3}
              autoComplete="off"
              maxLength={500}
              placeholder="It was louder than I expected…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className={s.actions}>
            <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={save} disabled={saving}>
              {saving ? "Updating your plan" : "Save Check In"}
            </button>
            {error ? (
              <p className={ui.error} role="alert">
                {error}
              </p>
            ) : (
              <p className={s.muted}>Your answer only changes your plan. Nobody at the venue sees it.</p>
            )}
          </div>
        </>
      ) : (
        <div className={s.actions}>
          <Link href="/plan" className={`${ui.btn} ${ui.primary}`}>
            Back to My Plan
            <ArrowRight size={18} weight="bold" aria-hidden />
          </Link>
          <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => { setSaved(null); setNote(""); }}>
            Check in somewhere else
          </button>
        </div>
      )}
    </main>
  );
}
