"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatCircleText, CheckCircle, CircleNotch, Info } from "@phosphor-icons/react";
import ui from "@/components/ui/ui.module.css";
import { Notice, Skeleton } from "@/components/ui/Notice";
import { loadProfile } from "@/lib/plan/store";
import { kindLine } from "@/lib/plan/format";
import { TIER_META, type ConnectionPlan, type Profile } from "@/lib/plan/types";
import { PlainMarkdown } from "./PlainMarkdown";
import s from "./compare.module.css";

type Side<T> = { status: "loading" | "done" | "error"; value?: T; message?: string; at?: string };
type Ev =
  | { type: "request"; requestText: string }
  | { side: "without"; type: "text"; text: string; generatedAt: string }
  | { side: "without"; type: "error"; message: string }
  | { side: "with"; type: "step"; label: string; cacheHit?: boolean }
  | { side: "with"; type: "plan"; plan: ConnectionPlan; generatedAt: string }
  | { side: "with"; type: "error"; message: string };

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");

export function CompareView() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [requestText, setRequestText] = useState<string>("");
  const [left, setLeft] = useState<Side<string>>({ status: "loading" });
  const [right, setRight] = useState<Side<ConnectionPlan>>({ status: "loading" });
  const [steps, setSteps] = useState<string[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (p: Profile) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLeft({ status: "loading" });
    setRight({ status: "loading" });
    setSteps([]);
    setFatal(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: p }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        setFatal(j?.message ?? "The comparison could not start. Please try again.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as Ev;
          if (e.type === "request") setRequestText(e.requestText);
          else if (e.side === "without" && e.type === "text") setLeft({ status: "done", value: e.text, at: e.generatedAt });
          else if (e.side === "without" && e.type === "error") setLeft({ status: "error", message: e.message });
          else if (e.side === "with" && e.type === "step") setSteps((xs) => [...xs, e.label]);
          else if (e.side === "with" && e.type === "plan") setRight({ status: "done", value: e.plan, at: e.generatedAt });
          else if (e.side === "with" && e.type === "error") setRight({ status: "error", message: e.message });
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setFatal("You seem to be offline. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (p) void run(p);
    return () => abort.current?.abort();
  }, [run]);

  if (profile === undefined) return null;
  if (profile === null) {
    return (
      <main id="main" className={s.main}>
        <h1 className={s.title}>Same question. Two answers.</h1>
        <Notice title="Pick a person to compare" action={<Link href="/start?sample=chicago">Use the Chicago example</Link>}>
          <p>The comparison sends one request about a real person to a general assistant and to Regulars, side by side. Start with an example or with your own loves.</p>
        </Notice>
      </main>
    );
  }

  const plan = right.value;

  return (
    <main id="main" className={s.main}>
      <h1 className={`${s.title} enter`}>Same question. Two answers.</h1>

      <figure className={`${s.quote} enter`} style={{ ["--i" as string]: 1 }}>
        <ChatCircleText size={28} color="var(--ink-muted)" aria-hidden style={{ flex: "none", marginTop: 4 }} />
        <div>
          <blockquote>{requestText ? `“${requestText}”` : <Skeleton height={56} width={640} />}</blockquote>
          <figcaption className={s.quoteNote}>Both sides receive exactly this text, at the same moment.</figcaption>
        </div>
      </figure>

      {fatal ? (
        <Notice tone="error" title="The comparison did not run" action={<button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => run(profile)}>Try again</button>}>
          <p>{fatal}</p>
        </Notice>
      ) : null}

      <div className={s.cols}>
        <section aria-labelledby="without" className={`${s.col} ${s.without}`} aria-busy={left.status === "loading"}>
          <div className={s.colHead}>
            <h2 id="without" className={s.colTitle}>
              Without Qloo
            </h2>
            <p className={s.colSub}>The same model, no tools and no taste data. Shown as returned.</p>
          </div>
          {left.status === "loading" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton height={18} />
              <Skeleton height={18} width="90%" />
              <Skeleton height={18} width="75%" />
            </div>
          ) : left.status === "error" ? (
            <Notice tone="error" title="No answer this time">
              <p>{left.message}</p>
            </Notice>
          ) : (
            <PlainMarkdown text={left.value ?? ""} className={s.answer} />
          )}
          <p className={s.foot}>
            <Info size={18} aria-hidden />
            Written without live place data, so nothing in it was checked against real places.
            {left.at ? ` Generated at ${time(left.at)}.` : ""}
          </p>
        </section>

        <section aria-labelledby="with" className={`${s.col} ${s.with}`} aria-busy={right.status === "loading"}>
          <div className={s.colHead}>
            <h2 id="with" className={s.colTitle}>
              With Qloo
            </h2>
            <p className={s.colSub}>The Regulars agent, grounded in the Qloo taste graph.</p>
          </div>
          {right.status === "loading" ? (
            <ol className={s.steps} aria-live="polite">
              {steps.map((st, i) => (
                <li key={`${st}-${i}`}>
                  {i === steps.length - 1 ? (
                    <CircleNotch size={18} color="var(--clay)" aria-hidden />
                  ) : (
                    <CheckCircle size={18} weight="fill" color="var(--clay)" aria-hidden />
                  )}
                  {st}
                </li>
              ))}
              {steps.length === 0 ? <li>Starting</li> : null}
            </ol>
          ) : right.status === "error" ? (
            <Notice tone="error" title="No grounded answer this time">
              <p>{right.message}</p>
            </Notice>
          ) : plan ? (
            <ol className={s.planList}>
              {plan.tiers.map((t) => {
                const p = t.featuredId ? plan.places[t.featuredId] : undefined;
                const top = p ? [...p.contributions].sort((a, b) => b.score - a.score)[0] : undefined;
                const topName = top ? profile.loves.find((l) => l.entity.id === top.entityId)?.entity.name : undefined;
                return (
                  <li key={t.key} className={s.planItem}>
                    <span className={s.planWeeks}>
                      {TIER_META[t.key].weeks}, {TIER_META[t.key].verb.replace(".", "").toLowerCase()}
                    </span>
                    <span className={s.planPlace}>{p?.name ?? "No place matched every constraint"}</span>
                    {p ? <span className={s.planKind}>{kindLine(p.categories)}{p.address ? `, ${p.address}` : ""}</span> : null}
                    {p && topName && top ? (
                      <span className={s.planWhy}>
                        <strong>Why you:</strong> {topName} drove {Math.round(top.score * 100)}% of this match, affinity{" "}
                        {p.affinity?.toFixed(2)}.
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}
          <p className={s.foot}>
            <CheckCircle size={18} weight="fill" color="var(--clay)" aria-hidden />
            Every place above came from the Qloo taste graph during this request, filtered by your constraints.
            {right.at ? ` Generated at ${time(right.at)}.` : ""}
          </p>
        </section>
      </div>

      <section className={`${s.how} reveal`} aria-labelledby="how">
        <div className={s.howText}>
          <h2 id="how" className={s.howTitle}>
            What makes the difference
          </h2>
          <p className={s.howBody}>
            Qloo connects what people love to the places they actually go. Regulars sends it the things you named and your
            neighborhood, and it returns places where people with taste like yours already gather, with the evidence for each one.
            The planner can only choose among those places.
          </p>
          {plan ? (
            <p className={s.meta}>
              {plan.steps.length} steps in this run. Same request, same model on both sides.
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/plan" className={`${ui.btn} ${ui.primary}`}>
            Back to My Plan
          </Link>
          <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => run(profile)}>
            Run Again
          </button>
        </div>
      </section>
    </main>
  );
}
