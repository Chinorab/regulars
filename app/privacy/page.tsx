import type { Metadata } from "next";
import { Check, X } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { DeleteLocalData } from "@/components/privacy/DeleteLocalData";
import s from "@/components/privacy/privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Regulars keeps, where it lives, and who receives what.",
};

const SECTIONS = [
  { id: "collect", title: "What you give us" },
  { id: "where", title: "Where it lives" },
  { id: "share", title: "Who receives what" },
  { id: "never", title: "What we never ask for" },
  { id: "linkworker", title: "Link worker mode" },
  { id: "cookies", title: "Cookies and tracking" },
  { id: "keep", title: "How long things last" },
  { id: "choices", title: "Your choices" },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className={s.main}>
        <div className={s.intro}>
          <h1 className={`${s.title} enter`}>Privacy</h1>
          <p className={`${s.lead} enter`} style={{ ["--i" as string]: 1 }}>
            No account. Your plan stays in your browser. Only two services see what you type, and only what they need.
          </p>
          <p className={s.date}>Effective October 16, 2026</p>
        </div>

        <div className={s.split}>
          <nav className={s.toc} aria-label="On this page">
            {SECTIONS.map((x) => (
              <a key={x.id} href={`#${x.id}`}>
                {x.title}
              </a>
            ))}
          </nav>

          <div className={s.body}>
            <section id="collect" className={s.section} aria-labelledby="h-collect">
              <h2 id="h-collect" className={s.h2}>
                What you give us
              </h2>
              <ul className={s.list}>
                {[
                  "The things you name: artists, films, books, shows, podcasts.",
                  "Your neighborhood and city. Never a street address.",
                  "Your budget, free days, whether to leave out bars, and how easy talking to someone new feels.",
                  "Your check in answers and optional notes.",
                ].map((t) => (
                  <li key={t}>
                    <Check size={18} weight="bold" color="var(--clay)" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="where" className={s.section} aria-labelledby="h-where">
              <h2 id="h-where" className={s.h2}>
                Where it lives
              </h2>
              <p className={s.p}>
                Your plan, taste choices, check ins and notes are saved in this browser&apos;s local storage, on this device only. We
                have no database of people and no accounts. If your browser blocks storage, Regulars still works for the visit and
                forgets everything when you close the tab.
              </p>
            </section>

            <section id="share" className={s.section} aria-labelledby="h-share">
              <h2 id="h-share" className={s.h2}>
                Who receives what
              </h2>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <tbody>
                    <tr>
                      <th scope="row">
                        <a href="https://www.qloo.com">Qloo</a>, taste data
                      </th>
                      <td>
                        The names you type (to find matches), the matched ids, your neighborhood and city, and any place you said you
                        would go back to. It returns places and the evidence behind each match.
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">
                        <a href="https://www.anthropic.com/legal/privacy">Anthropic</a>, the planner
                      </th>
                      <td>
                        One plain request built from your loves, neighborhood, budget, free days, drinking preference and ease with new
                        people, plus the Qloo results, so it can choose among real places and write the short texts.
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">
                        <a href="https://vercel.com/legal/privacy-policy">Vercel</a>, hosting
                      </th>
                      <td>Runs the site. Requests pass through it like any website. We do not log what you type.</td>
                    </tr>
                    <tr>
                      <th scope="row">
                        <a href="https://upstash.com/trust/privacy.pdf">Upstash</a>, cache
                      </th>
                      <td>
                        Stores Qloo answers for 24 hours so popular requests do not repeat, under a one way hashed key, and counts
                        requests per visitor under a hashed IP address. It never sees what you typed or your IP.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={s.p}>
                Your notes, check in answers and anything typed in link worker mode about a patient never leave your browser. We do not
                sell data and we do not show ads.
              </p>
            </section>

            <section id="never" className={s.section} aria-labelledby="h-never">
              <h2 id="h-never" className={s.h2}>
                What we never ask for
              </h2>
              <ul className={s.list}>
                {[
                  "Your street address or live location.",
                  "Your email, phone number or full name.",
                  "Your contacts or social media accounts.",
                  "Health records or a diagnosis.",
                ].map((t) => (
                  <li key={t}>
                    <X size={18} weight="bold" color="var(--ink-muted)" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="linkworker" className={s.section} aria-labelledby="h-lw">
              <h2 id="h-lw" className={s.h2}>
                Link worker mode
              </h2>
              <p className={s.p}>
                The patient&apos;s first name, your name and your phone number are only used to print the sheet. They stay in the
                page&apos;s memory, are never sent to a server, and are erased as soon as the sheet is printed or you press Start Over.
                Only the loves, neighborhood and needs are used to find places, the same way as above. We create no patient record,
                and the patient needs no account or phone.
              </p>
            </section>

            <section id="cookies" className={s.section} aria-labelledby="h-cookies">
              <h2 id="h-cookies" className={s.h2}>
                Cookies and tracking
              </h2>
              <p className={s.p}>No cookies, no analytics, no ad pixels, no third party scripts.</p>
            </section>

            <section id="keep" className={s.section} aria-labelledby="h-keep">
              <h2 id="h-keep" className={s.h2}>
                How long things last
              </h2>
              <ul className={s.list}>
                {[
                  "In your browser: until you delete it with the button below or clear your browser data.",
                  "Cached Qloo answers: 24 hours.",
                  "Visitor counts for rate limits: about an hour.",
                  "Anthropic and Vercel handle request data under their own policies, linked above.",
                ].map((t) => (
                  <li key={t}>
                    <Check size={18} weight="bold" color="var(--clay)" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="choices" className={s.section} aria-labelledby="h-choices">
              <h2 id="h-choices" className={s.h2}>
                Your choices
              </h2>
              <div className={s.box}>
                <p className={s.p}>Remove everything Regulars saved in this browser, right now.</p>
                <DeleteLocalData />
              </div>
              <p className={s.p}>
                Questions or requests? Open an issue on the <a href="https://github.com/Chinorab/regulars/issues">project&apos;s public
                repository</a>. A person reads every one.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
