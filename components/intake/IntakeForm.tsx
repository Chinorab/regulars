"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, MapPin, Plus, X, WarningCircle, CircleNotch } from "@phosphor-icons/react";
import { Mark } from "@/components/ui/Mark";
import ui from "@/components/ui/ui.module.css";
import { api, ClientApiError } from "@/lib/client/api";
import { DAYS, type Day, type Entity, type Profile, type ResolvedLocality } from "@/lib/plan/types";
import { clearPlan, loadProfile, saveProfile } from "@/lib/plan/store";
import { DAY_SHORT, capDay } from "@/lib/plan/format";
import s from "./intake.module.css";

type Love = {
  key: string;
  query: string;
  status: "loading" | "ok" | "none" | "error";
  matches: Entity[];
  selected: number;
  open: boolean;
  message?: string;
};

type LocState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; locality: ResolvedLocality; city: string }
  | { status: "error"; message: string };

const BUDGETS: { id: Profile["budget"]; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "u15", label: "Under $15" },
  { id: "u40", label: "Under $40" },
  { id: "any", label: "Any" },
];

export type IntakeInitial = {
  loves: { query: string; kind?: string }[];
  location: string;
  budget?: Profile["budget"];
  evenings?: Day[];
  noAlcohol?: boolean;
  socialEase?: number;
  sample?: string;
};

let keySeq = 0;
const nextKey = () => `l${++keySeq}`;

export function splitCity(location: string): string | null {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1]! : null;
}

export function IntakeForm({ initial }: { initial?: IntakeInitial }) {
  const router = useRouter();
  const ids = { loves: useId(), hood: useId() };
  const [loves, setLoves] = useState<Love[]>([]);
  const [draft, setDraft] = useState("");
  const [location, setLocation] = useState("");
  const [loc, setLoc] = useState<LocState>({ status: "idle" });
  const [budget, setBudget] = useState<Profile["budget"]>("any");
  const [evenings, setEvenings] = useState<Day[]>([]);
  const [noAlcohol, setNoAlcohol] = useState(false);
  const [ease, setEase] = useState(3);
  const [sample, setSample] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const started = useRef(false);

  // Prefill from a sample profile or a previous visit.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initial) {
      setSample(initial.sample);
      setBudget(initial.budget ?? "any");
      setEvenings(initial.evenings ?? []);
      setNoAlcohol(initial.noAlcohol ?? false);
      setEase(initial.socialEase ?? 3);
      setLocation(initial.location);
      initial.loves.forEach((l) => addLove(l.query, l.kind));
      void checkLocation(initial.location);
      return;
    }
    const prev = loadProfile();
    if (prev) {
      setBudget(prev.budget);
      setEvenings(prev.evenings);
      setNoAlcohol(prev.noAlcohol);
      setEase(prev.socialEase);
      setLocation(prev.locality.query);
      setLoc({ status: "ok", locality: prev.locality, city: prev.city });
      setLoves(
        prev.loves.map((l) => ({ key: nextKey(), query: l.query, status: "ok", matches: [l.entity], selected: 0, open: false })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(key: string, patch: Partial<Love>) {
    setLoves((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLove(raw: string, preferKind?: string) {
    const query = raw.trim();
    if (!query) return;
    const key = nextKey();
    setLoves((ls) => (ls.length >= 5 ? ls : [...ls, { key, query, status: "loading", matches: [], selected: 0, open: false }]));
    api
      .resolve(query)
      .then((r) => {
        const pref = preferKind ? r.matches.findIndex((m) => m.kind === preferKind) : -1;
        update(key, { status: r.matches.length ? "ok" : "none", matches: r.matches, selected: Math.max(0, pref) });
      })
      .catch((e: unknown) =>
        update(key, { status: "error", message: e instanceof ClientApiError ? e.message : "Lookup failed." }),
      );
  }

  async function checkLocation(value: string) {
    const city = splitCity(value);
    if (!value.trim()) return setLoc({ status: "idle" });
    if (!city) return setLoc({ status: "error", message: "Add your city after a comma, like Logan Square, Chicago." });
    setLoc({ status: "checking" });
    try {
      const r = await api.locality(value.trim(), city);
      setLoc({ status: "ok", locality: r.locality, city });
    } catch (e) {
      const d = e instanceof ClientApiError ? e.detail : null;
      setLoc({
        status: "error",
        message:
          d?.error === "locality_not_found"
            ? d.resolvedTo
              ? `That matched ${d.resolvedTo.split(",").slice(0, 2).join(",")}, outside your city. Check the spelling?`
              : "We could not find that neighborhood in the United States. Check the spelling?"
            : (d?.message ?? "We could not check that place right now."),
      });
    }
  }

  const resolved = loves.filter((l) => l.status === "ok");
  const ready = resolved.length >= 1 && loc.status === "ok";

  function submit() {
    if (!ready || loc.status !== "ok") {
      setSubmitError(
        resolved.length === 0 ? "Add at least one thing you love that we can find." : "Check your neighborhood and city first.",
      );
      return;
    }
    const profile: Profile = {
      loves: resolved.map((l) => ({ query: l.query, entity: l.matches[l.selected]! })),
      locality: loc.locality,
      city: loc.city,
      budget,
      evenings,
      noAlcohol,
      socialEase: ease,
      removedTagIds: [],
      needs: { daytime: false, stepFree: false },
      sample,
    };
    saveProfile(profile);
    clearPlan();
    router.push("/taste");
  }

  return (
    <main id="main" className={s.main}>
      <section className={`${s.q} enter`} aria-labelledby="q1">
        <div className={s.qHead}>
          <Mark size={28} />
          <div className={s.qText}>
            <h1 id="q1" className={s.qTitle}>
              What do you love? Name three to five things.
            </h1>
            <p className={s.qLead}>Artists, films, books, shows, podcasts. Whatever you would recommend to a friend.</p>
          </div>
        </div>
        <div className={s.indent}>
          <form
            className={ui.field}
            onSubmit={(e) => {
              e.preventDefault();
              addLove(draft);
              setDraft("");
            }}
          >
            <label htmlFor={ids.loves} className={ui.label}>
              Add one at a time
            </label>
            <div className={s.addRow}>
              <input
                id={ids.loves}
                className={ui.input}
                name="favorite"
                autoComplete="off"
                placeholder="Big Thief, Past Lives, The Bear…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={loves.length >= 5}
              />
              <button type="submit" className={`${ui.btn} ${ui.outline}`} disabled={!draft.trim() || loves.length >= 5}>
                <Plus size={18} weight="bold" aria-hidden />
                Add
              </button>
            </div>
            <p className={ui.help}>{loves.length >= 5 ? "Five is plenty." : "Press Enter to add."}</p>
          </form>

          {loves.length > 0 ? (
            <>
              <p className={s.found} aria-live="polite">
                {loves.some((l) => l.status === "loading") ? (
                  <>
                    <CircleNotch size={18} aria-hidden /> Looking them up
                  </>
                ) : (
                  <>
                    <Check size={18} weight="bold" color="var(--clay)" aria-hidden />
                    {resolved.length === loves.length
                      ? `We found ${resolved.length === 1 ? "it" : resolved.length === 2 ? "both" : `all ${resolved.length}`}`
                      : `We found ${resolved.length} of ${loves.length}`}
                  </>
                )}
              </p>
              <div className={s.cards}>
                {loves.map((l) => (
                  <LoveCard
                    key={l.key}
                    love={l}
                    onRemove={() => setLoves((ls) => ls.filter((x) => x.key !== l.key))}
                    onPick={(i) => update(l.key, { selected: i, open: false })}
                    onToggle={() => update(l.key, { open: !l.open })}
                  />
                ))}
              </div>
              {resolved.length > 0 && resolved.length < 3 ? (
                <p className={ui.help}>Three or more makes the plan more precise.</p>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      <section className={`${s.q} reveal`} aria-labelledby="q2">
        <div className={s.qHead}>
          <Mark size={28} />
          <div className={s.qText}>
            <h2 id="q2" className={s.qTitle}>
              Where do you live?
            </h2>
            <p className={s.qLead}>A neighborhood is enough. We never ask for your address.</p>
          </div>
        </div>
        <div className={`${s.indent} ${ui.field}`}>
          <label htmlFor={ids.hood} className={ui.label}>
            Neighborhood and city
          </label>
          <div className={s.inputWrap}>
            <MapPin size={20} color="var(--ink-muted)" aria-hidden />
            <input
              id={ids.hood}
              className={`${ui.input} ${s.withIcon}`}
              name="neighborhood"
              autoComplete="address-level2"
              placeholder="Logan Square, Chicago…"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setLoc({ status: "idle" });
              }}
              onBlur={() => void checkLocation(location)}
              aria-describedby={`${ids.hood}-status`}
              aria-invalid={loc.status === "error"}
            />
          </div>
          <p id={`${ids.hood}-status`} aria-live="polite" className={loc.status === "error" ? ui.error : s.found}>
            {loc.status === "checking" ? "Checking the map" : null}
            {loc.status === "ok" ? (
              <>
                <Check size={18} weight="bold" color="var(--clay)" aria-hidden />
                {`${loc.locality.name}, ${loc.city}`}
              </>
            ) : null}
            {loc.status === "error" ? loc.message : null}
          </p>
        </div>
      </section>

      <section className={`${s.q} reveal`} aria-labelledby="q3">
        <div className={s.qHead}>
          <Mark size={28} />
          <div className={s.qText}>
            <h2 id="q3" className={s.qTitle}>
              What fits your life right now?
            </h2>
            <p className={s.qLead}>We only suggest places that respect these.</p>
          </div>
        </div>
        <div className={s.constraints}>
          <fieldset className={s.fieldset}>
            <legend className={s.legend}>Budget per outing</legend>
            <div className={s.toggles}>
              {BUDGETS.map((b) => (
                <button key={b.id} type="button" className={ui.toggle} aria-pressed={budget === b.id} onClick={() => setBudget(b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={s.fieldset}>
            <legend className={s.legend}>Days you are usually free</legend>
            <div className={s.toggles}>
              {DAYS.map((d) => {
                const on = evenings.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`${ui.toggle} ${s.day}`}
                    aria-pressed={on}
                    aria-label={capDay(d)}
                    onClick={() => setEvenings((xs) => (on ? xs.filter((x) => x !== d) : [...xs, d]))}
                  >
                    {DAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
            <p className={ui.help}>Leave empty if any day works. We check opening hours where Qloo lists them.</p>
          </fieldset>

          <div className={s.fieldset}>
            <p className={s.legend}>Drinking</p>
            <button type="button" className={`${ui.toggle} ${s.check}`} aria-pressed={noAlcohol} onClick={() => setNoAlcohol(!noAlcohol)}>
              <span className={s.box} aria-hidden>
                {noAlcohol ? <Check size={14} weight="bold" /> : null}
              </span>
              Leave out bars, pubs and breweries
            </button>
          </div>

          <fieldset className={s.fieldset}>
            <legend className={s.legend} style={{ marginBottom: 4 }}>
              How easy is it for you to talk to someone new?
            </legend>
            <p className={ui.help} style={{ fontSize: 15, marginBottom: 4 }}>
              This sets the pace of your plan. No wrong answer.
            </p>
            <div className={s.ease}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={ui.toggle} aria-pressed={ease === n} aria-label={`Ease ${n} of 5`} onClick={() => setEase(n)}>
                  {n}
                </button>
              ))}
            </div>
            <div className={s.scale} aria-hidden>
              <span>Very hard</span>
              <span>Easy</span>
            </div>
          </fieldset>
        </div>
      </section>

      <div className={s.footer}>
        <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={submit} aria-disabled={!ready}>
          See My Taste Profile
          <ArrowRight size={18} weight="bold" aria-hidden />
        </button>
        {submitError ? (
          <p className={ui.error} role="alert">
            {submitError}
          </p>
        ) : (
          <p className={s.muted}>You can change any of this later.</p>
        )}
      </div>
    </main>
  );
}

function LoveCard({
  love,
  onRemove,
  onPick,
  onToggle,
}: {
  love: Love;
  onRemove: () => void;
  onPick: (i: number) => void;
  onToggle: () => void;
}) {
  const m = love.matches[love.selected];
  const groupName = useId();
  return (
    <div className={s.card}>
      <div className={s.cardRow}>
        {m?.imageUrl ? (
          <Image className={s.thumb} src={m.imageUrl} alt={`Image of ${m.name}`} width={72} height={72} />
        ) : (
          <div className={s.thumb} role="img" aria-label={m ? `No image for ${m.name}` : "Looking up"} />
        )}
        <div className={s.cardText}>
          <p className={s.cardName}>{m?.name ?? love.query}</p>
          <p className={s.cardKind}>
            {love.status === "loading" ? "Looking it up" : null}
            {love.status === "ok" ? m?.kind : null}
            {love.status === "none" ? "No match found. Try another spelling." : null}
            {love.status === "error" ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <WarningCircle size={16} aria-hidden /> {love.message}
              </span>
            ) : null}
          </p>
        </div>
        <button type="button" className={s.iconBtn} aria-label={`Remove ${m?.name ?? love.query}`} onClick={onRemove}>
          <X size={18} weight="bold" aria-hidden />
        </button>
      </div>
      {love.status === "ok" && love.matches.length > 1 ? (
        <>
          <button type="button" className={s.linkBtn} onClick={onToggle} aria-expanded={love.open}>
            {love.open ? "Keep this one" : "Not this one?"}
          </button>
          {love.open ? (
            <fieldset className={s.alts}>
              <legend className="visually-hidden">Choose the right {love.query}</legend>
              {love.matches.map((alt, i) => (
                <label key={alt.id} className={s.alt}>
                  <input type="radio" name={groupName} checked={i === love.selected} onChange={() => onPick(i)} />
                  {alt.name} <span className={s.cardKind}>{alt.kind}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
