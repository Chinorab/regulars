"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, CheckCircle, CircleNotch, Printer, ArrowCounterClockwise } from "@phosphor-icons/react";
import ui from "@/components/ui/ui.module.css";
import { Notice } from "@/components/ui/Notice";
import { api, ClientApiError, planRequest, streamNdjson } from "@/lib/client/api";
import type { ConnectionPlan, Entity, Profile, ResolvedLocality } from "@/lib/plan/types";
import type { SheetLang } from "@/content/sheet";
import { splitCity } from "@/components/intake/IntakeForm";
import { PatientSheet } from "./PatientSheet";
import s from "./linkworker.module.css";

type Needs = { daytime: boolean; stepFree: boolean; free: boolean; noAlcohol: boolean };
const NEED_LABELS: { key: keyof Needs; label: string }[] = [
  { key: "stepFree", label: "Step free entrance" },
  { key: "daytime", label: "Daytime only" },
  { key: "free", label: "Free or low cost" },
  { key: "noAlcohol", label: "No bars or breweries" },
];

type LoveSlot = { text: string; match?: Entity; status: "idle" | "loading" | "ok" | "none" };
const empty = (): LoveSlot[] => [{ text: "", status: "idle" }, { text: "", status: "idle" }, { text: "", status: "idle" }];

// Link worker mode keeps everything in memory. Nothing is written to browser storage, and
// the form is wiped after printing or on Start over (FR-022).
export function LinkWorkerView() {
  const ids = { name: useId(), hood: useId(), lang: useId(), worker: useId(), phone: useId(), love: useId() };
  const [firstName, setFirstName] = useState("");
  const [location, setLocation] = useState("");
  const [locality, setLocality] = useState<{ value: ResolvedLocality; city: string } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [loves, setLoves] = useState<LoveSlot[]>(empty);
  const [needs, setNeeds] = useState<Needs>({ daytime: false, stepFree: false, free: false, noAlcohol: false });
  const [ease, setEase] = useState(2);
  const [lang, setLang] = useState<SheetLang>("en");
  const [worker, setWorker] = useState("");
  const [phone, setPhone] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [building, setBuilding] = useState(false);
  const [plan, setPlan] = useState<ConnectionPlan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const printed = useRef(false);
  const dirty = Boolean(firstName || location || worker || phone || loves.some((l) => l.text));

  // Warn before leaving a filled form: nothing is saved, so leaving loses it.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function reset(afterPrint = false) {
    setFirstName("");
    setLocation("");
    setLocality(null);
    setLocError(null);
    setLoves(empty());
    setNeeds({ daytime: false, stepFree: false, free: false, noAlcohol: false });
    setEase(2);
    setLang("en");
    setWorker("");
    setPhone("");
    setSteps([]);
    setPlan(null);
    setProfile(null);
    setError(null);
    setCleared(afterPrint);
    setConfirmReset(false);
  }

  useEffect(() => {
    const onAfterPrint = () => {
      if (printed.current) {
        printed.current = false;
        reset(true);
      }
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  async function resolveSlot(i: number) {
    const text = loves[i]?.text.trim();
    if (!text) return;
    setLoves((ls) => ls.map((l, j) => (j === i ? { ...l, status: "loading" } : l)));
    try {
      const r = await api.resolve(text);
      setLoves((ls) => ls.map((l, j) => (j === i ? { ...l, match: r.matches[0], status: r.matches[0] ? "ok" : "none" } : l)));
    } catch {
      setLoves((ls) => ls.map((l, j) => (j === i ? { ...l, status: "none" } : l)));
    }
  }

  async function checkLocation() {
    const city = splitCity(location);
    if (!location.trim()) return;
    if (!city) return setLocError("Add the city after a comma, like Logan Square, Chicago.");
    setLocError(null);
    try {
      const r = await api.locality(location.trim(), city);
      setLocality({ value: r.locality, city });
    } catch (e) {
      setLocality(null);
      setLocError(e instanceof ClientApiError && e.detail.error === "locality_not_found" ? "We could not find that neighborhood in the United States." : "We could not check that place right now.");
    }
  }

  function build() {
    const resolved = loves.filter((l) => l.status === "ok" && l.match);
    if (!locality || resolved.length === 0) {
      setError(!locality ? "Check the neighborhood and city first." : "Add at least one thing they love that we can find.");
      return;
    }
    const p: Profile = {
      loves: resolved.map((l) => ({ query: l.text, entity: l.match! })),
      locality: locality.value,
      city: locality.city,
      budget: needs.free ? "free" : "any",
      evenings: [],
      noAlcohol: needs.noAlcohol,
      socialEase: ease,
      removedTagIds: [],
      needs: { daytime: needs.daytime, stepFree: needs.stepFree },
    };
    setProfile(p);
    setPlan(null);
    setSteps([]);
    setError(null);
    setCleared(false);
    setBuilding(true);
    void streamNdjson("/api/plan", planRequest(p), (e) => {
      if (e.type === "step") setSteps((xs) => [...xs, e.label]);
      if (e.type === "plan") setPlan(e.plan);
      if (e.type === "error") setError(e.message);
    }).finally(() => setBuilding(false));
  }

  function print() {
    printed.current = true;
    window.print();
  }

  return (
    <main id="main" className={s.main}>
      <div className={s.intro}>
        <h1 className={`${s.title} enter`}>Plan it together. Hand it over on paper.</h1>
        <p className={`${s.lead} enter`} style={{ ["--i" as string]: 1 }}>
          For link workers, social prescribers and care teams. Fill this in with your patient. Nothing here is saved, and the form
          clears itself after you print.
        </p>
      </div>

      {cleared ? (
        <Notice title="Sheet printed. Everything you typed has been cleared.">
          <p>Nothing about your patient was kept in this browser.</p>
        </Notice>
      ) : null}

      <div className={s.layout}>
        <form
          className={s.form}
          aria-label="Patient plan"
          onSubmit={(e) => {
            e.preventDefault();
            build();
          }}
        >
          <div className={s.two}>
            <div className={ui.field}>
              <label htmlFor={ids.name} className={ui.label}>
                First name on the sheet
              </label>
              <input id={ids.name} className={ui.input} name="first-name" autoComplete="off" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Denise…" />
            </div>
            <div className={ui.field}>
              <label htmlFor={ids.hood} className={ui.label}>
                Neighborhood and city
              </label>
              <input
                id={ids.hood}
                className={ui.input}
                name="neighborhood"
                autoComplete="off"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setLocality(null);
                }}
                onBlur={() => void checkLocation()}
                placeholder="Logan Square, Chicago…"
                aria-invalid={Boolean(locError)}
              />
              <p className={locError ? ui.error : s.resolved} aria-live="polite">
                {locError ?? (locality ? `${locality.value.name}, ${locality.city}` : "")}
              </p>
            </div>
          </div>

          <fieldset className={s.fieldset}>
            <legend className={s.legend}>Three things they love</legend>
            {loves.map((l, i) => (
              <div key={i} className={ui.field}>
                <label htmlFor={`${ids.love}-${i}`} className="visually-hidden">
                  Thing they love {i + 1}
                </label>
                <input
                  id={`${ids.love}-${i}`}
                  className={ui.input}
                  autoComplete="off"
                  value={l.text}
                  placeholder={["Aretha Franklin…", "The Great British Baking Show…", "Steel Magnolias…"][i]}
                  onChange={(e) => setLoves((ls) => ls.map((x, j) => (j === i ? { text: e.target.value, status: "idle" } : x)))}
                  onBlur={() => void resolveSlot(i)}
                />
                <p className={s.resolved} aria-live="polite">
                  {l.status === "loading" ? "Looking it up" : null}
                  {l.status === "ok" && l.match ? `${l.match.name}, ${l.match.kind}` : null}
                  {l.status === "none" ? "No match found. Try another spelling." : null}
                </p>
              </div>
            ))}
          </fieldset>

          <fieldset className={s.fieldset}>
            <legend className={s.legend}>Needs</legend>
            <div className={s.toggles}>
              {NEED_LABELS.map((n) => (
                <button key={n.key} type="button" className={`${ui.toggle} ${s.need}`} aria-pressed={needs[n.key]} onClick={() => setNeeds((x) => ({ ...x, [n.key]: !x[n.key] }))}>
                  <span className={s.box} aria-hidden>
                    {needs[n.key] ? <Check size={12} weight="bold" /> : null}
                  </span>
                  {n.label}
                </button>
              ))}
            </div>
            <p className={ui.help}>Applied where Qloo lists the detail. Anything it does not list is printed as Call ahead to check.</p>
          </fieldset>

          <fieldset className={s.fieldset}>
            <legend className={s.legend}>How easy is talking to someone new, for them?</legend>
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

          <div className={s.two}>
            <div className={ui.field}>
              <label htmlFor={ids.lang} className={ui.label}>
                Sheet language
              </label>
              <select id={ids.lang} className={`${ui.input} ${s.select}`} value={lang} onChange={(e) => setLang(e.target.value as SheetLang)}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div className={ui.field}>
              <label htmlFor={ids.worker} className={ui.label}>
                Your name
              </label>
              <input id={ids.worker} className={ui.input} name="worker-name" autoComplete="name" value={worker} onChange={(e) => setWorker(e.target.value)} placeholder="Jordan Ellis…" />
            </div>
            <div className={ui.field}>
              <label htmlFor={ids.phone} className={ui.label}>
                Your phone
              </label>
              <input id={ids.phone} className={ui.input} name="worker-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(312) 555 0148…" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button type="submit" className={`${ui.btn} ${ui.primary}`} disabled={building}>
              {building ? "Building the sheet" : plan ? "Build Again" : "Build the Sheet"}
            </button>
            {confirmReset ? (
              <>
                <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => reset(false)}>
                  Yes, Clear the Form
                </button>
                <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => setConfirmReset(false)}>
                  Keep Editing
                </button>
              </>
            ) : (
              <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => (dirty ? setConfirmReset(true) : reset(false))}>
                <ArrowCounterClockwise size={18} aria-hidden />
                Start Over
              </button>
            )}
          </div>
          {error ? (
            <p className={ui.error} role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <aside className={s.aside} aria-labelledby="preview">
          <h2 id="preview" className={s.asideTitle}>
            The sheet
          </h2>
          {plan && profile ? (
            <>
              <div className={s.previewWrap}>
                <PatientSheet plan={plan} profile={profile} firstName={firstName} lang={lang} worker={worker} phone={phone} />
              </div>
              <button type="button" className={`${ui.btn} ${ui.primary}`} onClick={print}>
                <Printer size={18} aria-hidden />
                Print Sheet
              </button>
              <p className={s.note}>Letter size, large print. Your patient does not need an account or a phone. After printing, this form clears.</p>
            </>
          ) : building ? (
            <ol className={s.steps} aria-live="polite">
              {steps.map((st, i) => (
                <li key={`${st}-${i}`}>
                  {i === steps.length - 1 ? <CircleNotch size={18} color="var(--clay)" aria-hidden /> : <CheckCircle size={18} weight="fill" color="var(--clay)" aria-hidden />}
                  {st}
                </li>
              ))}
              {steps.length === 0 ? <li>Starting</li> : null}
            </ol>
          ) : (
            <p className={s.note}>Fill in the form and build the sheet. A preview appears here before you print.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
