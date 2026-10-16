import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { SAMPLES } from "@/content/samples";
import { FACTS, SOURCES } from "@/content/sources";
import s from "@/components/home/home.module.css";

export default function Home() {
  const [lead, ...rest] = FACTS;
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className={s.hero}>
          <div className={s.heroText}>
            <h1 className={`${s.h1} enter`}>Become a regular somewhere.</h1>
            <p className={`${s.lead} enter`} style={{ ["--i" as string]: 1 }}>
              Name what you love. We find the places your people already go, then plan six weeks of showing up.
            </p>
            <div className="enter" style={{ ["--i" as string]: 2 }}>
              <ButtonLink href="/start" arrow>
                Find My Places
              </ButtonLink>
            </div>
          </div>
          <div className={`${s.door} enter`} style={{ ["--i" as string]: 3 }} role="img" aria-label="An open doorway, lit warm from inside, at night">
            <div className={s.floor} />
            <div className={s.spill} />
            <div className={s.lit} />
            <div className={s.window} style={{ left: "7%" }} />
            <div className={s.window} style={{ right: "8%" }} />
          </div>
        </section>

        <div className={s.wrap}>
          <section className={`${s.samples} reveal`} aria-labelledby="samples">
            <div className={s.samplesHead}>
              <h2 id="samples" className={s.h2small}>
                Try it with a real example.
              </h2>
              <p className={s.note}>One click fills in a sample person. The places are looked up live, the same way yours would be.</p>
            </div>
            <ul className={s.sampleList}>
              {SAMPLES.map((p) => (
                <li key={p.id}>
                  <Link href={`/start?sample=${p.id}`} className={s.sample}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className={s.sampleWho}>{p.short}</span>
                      <span className={s.sampleLoves}>{p.loves.map((l) => l.query).join(", ")}</span>
                    </span>
                    <span className={s.sampleGo}>
                      Run this example
                      <ArrowRight size={16} weight="bold" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {lead ? (
            <section className={`${s.problem} reveal`} aria-labelledby="problem">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h2 id="problem" className={s.statement}>
                  <span className={s.statementFig}>{lead.figure}</span> {lead.text}
                </h2>
                <p className={s.cite}>
                  Source: <a href={lead.source.url}>{lead.source.title}</a>, {lead.source.publisher}, {lead.source.date}
                </p>
              </div>
              <div className={s.facts}>
                {rest.map((f) => (
                  <div key={f.figure} className={s.fact}>
                    <p className={s.factFig}>{f.figure}</p>
                    <p className={s.factText}>{f.text}</p>
                    <p className={s.cite}>
                      Source: <a href={f.source.url}>{f.source.title}</a>, {f.source.publisher}
                    </p>
                  </div>
                ))}
              </div>
              <p className={s.claim}>
                Congress is now weighing a{" "}
                <a href={SOURCES.congress.url}>National Strategy for Social Connection Act</a>. The usual advice, to get out more
                and join a club, rarely sticks. What tends to work is returning to the same place, where people who like what you
                like are already there.
              </p>
            </section>
          ) : null}

          <section id="how" className={s.how} aria-labelledby="how-title">
            <h2 id="how-title" className={`${s.howTitle} reveal`}>
              Six weeks. One place that knows your face.
            </h2>
            <div>
              <div className={`${s.row} reveal`}>
                <p className={s.rowWeeks}>Weeks 1 and 2</p>
                <h3 className={s.rowVerb}>Show up.</h3>
                <p className={s.rowText}>Go alone. Sit near the back. Leave whenever you like.</p>
              </div>
              <div className={`${s.row} ${s.r2} reveal`}>
                <p className={s.rowWeeks}>Weeks 3 and 4</p>
                <h3 className={s.rowVerb}>Come back.</h3>
                <p className={s.rowText}>Same place, same time of week. Faces start to repeat, and so does yours.</p>
              </div>
              <div className={`${s.row} ${s.r3} reveal`}>
                <p className={s.rowWeeks}>Weeks 5 and 6</p>
                <h3 className={s.rowVerb} style={{ color: "var(--clay)" }}>
                  Join in.
                </h3>
                <p className={s.rowText}>Take one small part. A question, a seat at the table, a name.</p>
              </div>
            </div>
          </section>

          <section className={`${s.proof} reveal`} aria-labelledby="proof">
            <div className={s.panelText}>
              <h2 id="proof" className={s.panelTitle}>
                Real places, not general advice.
              </h2>
              <p className={s.panelBody}>
                Every place comes from the Qloo taste graph, with the evidence for why it fits you. See the same question answered
                with and without it.
              </p>
            </div>
            <ButtonLink href="/compare" variant="outline" arrow>
              See the Difference
            </ButtonLink>
          </section>

          <section className={`${s.panel} reveal`} aria-labelledby="lw">
            <div className={s.panelText}>
              <h2 id="lw" className={s.panelTitle}>
                Work in social prescribing?
              </h2>
              <p className={s.panelBody}>Build a plan with a patient and hand it over on paper, in plain words.</p>
            </div>
            <ButtonLink href="/link-worker" variant="outline" arrow>
              Open Link Worker Mode
            </ButtonLink>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
