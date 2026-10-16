"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, X } from "@phosphor-icons/react";
import ui from "@/components/ui/ui.module.css";
import { Notice, Skeleton } from "@/components/ui/Notice";
import { api, ClientApiError, type TagView } from "@/lib/client/api";
import { clearPlan, loadProfile, saveProfile } from "@/lib/plan/store";
import { constraintsLine, joinWords, prettyTag } from "@/lib/plan/format";
import type { Profile } from "@/lib/plan/types";
import s from "./taste.module.css";

type Data = { taste: TagView[]; rooms: TagView[]; portrait: { headline: string; body: string } | null };

export function TasteView() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((p: Profile) => {
    setError(null);
    api
      .taste(
        p.loves.map((l) => l.entity.id),
        p.removedTagIds,
      )
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ClientApiError ? e.message : "Taste data could not be loaded."));
  }, []);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (p) load(p);
  }, [load]);

  if (profile === undefined) return null;
  if (profile === null) {
    return (
      <main id="main" className={s.main}>
        <Notice title="Nothing here yet" action={<Link href="/start">Tell us what you love</Link>}>
          <p>Your taste profile appears after you name a few things you love.</p>
        </Notice>
      </main>
    );
  }

  function removeTag(id: string) {
    if (!profile || !data) return;
    const next = { ...profile, removedTagIds: [...new Set([...profile.removedTagIds, id])] };
    saveProfile(next);
    clearPlan();
    setProfile(next);
    setData({ ...data, taste: data.taste.filter((t) => t.id !== id), rooms: data.rooms.filter((t) => t.id !== id) });
  }

  // A tag is traced to the loves whose own Qloo tags include it.
  function from(tag: TagView) {
    const names = profile!.loves.filter((l) => l.entity.tagIds?.includes(tag.id)).map((l) => l.entity.name);
    return names.length ? `From ${joinWords(names)}` : "From your loves together";
  }

  const tags = data ? [...data.taste.slice(0, 8)] : [];
  const rooms = data ? data.rooms.slice(0, 3) : [];

  return (
    <main id="main" className={s.main}>
      <section className={s.hero}>
        <p className={`${s.eyebrow} enter`}>Your taste, as Qloo reads it</p>
        {data ? (
          <>
            <h1 className={`${s.title} enter`} style={{ ["--i" as string]: 1 }}>
              {data.portrait?.headline ?? "Here is what your loves have in common."}
            </h1>
            {data.portrait ? (
              <p className={`${s.lead} enter`} style={{ ["--i" as string]: 2 }}>
                {data.portrait.body}
              </p>
            ) : null}
            <p className={s.note}>
              {data.portrait
                ? "Written from the tags below, which come straight from the Qloo taste graph."
                : "The tags below come straight from the Qloo taste graph."}
            </p>
          </>
        ) : error ? null : (
          <>
            <Skeleton height={64} width="80%" />
            <Skeleton height={24} width="55%" />
          </>
        )}
      </section>

      {error ? (
        <Notice tone="error" title="Taste data is not available" action={<button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => load(profile)}>Try again</button>}>
          <p>{error}</p>
        </Notice>
      ) : null}

      <div className={s.split}>
        <section aria-labelledby="tags" className={s.tags}>
          <h2 id="tags" className={s.h2}>
            What we will look for
          </h2>
          <div className={s.grid}>
            {data
              ? [...tags, ...rooms].map((t, i) => {
                  const size = i < 2 ? s.l : i < 5 ? s.m : s.s;
                  const isRoom = rooms.includes(t);
                  return (
                    <div key={t.id} className={s.tag} style={{ ["--i" as string]: i }}>
                      <div className={s.tagText}>
                        <p className={`${s.tagName} ${size} ${i === 0 ? s.accent : ""}`}>
                          {isRoom ? `${prettyTag(t.name)} rooms` : prettyTag(t.name)}
                        </p>
                        <p className={s.from}>{from(t)}</p>
                      </div>
                      <button type="button" className={ui.btn + " " + ui.ghost} style={{ border: 0, padding: 0, width: 44, height: 44 }} aria-label={`Remove ${prettyTag(t.name)}`} onClick={() => removeTag(t.id)}>
                        <X size={16} weight="bold" aria-hidden />
                      </button>
                    </div>
                  );
                })
              : Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={s.tag}>
                    <Skeleton height={30} width="70%" />
                  </div>
                ))}
          </div>
          <p className={s.note}>Remove anything that is not you. The plan will leave it out.</p>
        </section>

        <aside aria-labelledby="built" className={`${s.aside} reveal`}>
          <h2 id="built" style={{ fontSize: 16, fontFamily: "var(--font-body)" }}>
            Built from
          </h2>
          {profile.loves.map((l) => (
            <div key={l.entity.id} className={s.src}>
              {l.entity.imageUrl ? (
                <Image className={s.srcImg} src={l.entity.imageUrl} alt={`Image of ${l.entity.name}`} width={52} height={52} />
              ) : (
                <div className={s.srcImg} role="img" aria-label={`No image for ${l.entity.name}`} />
              )}
              <div style={{ minWidth: 0 }}>
                <p className={s.srcName}>{l.entity.name}</p>
                <p className={s.from}>{l.entity.kind}</p>
              </div>
            </div>
          ))}
          <div className={s.facts}>
            <p>{`${profile.locality.name}, ${profile.city}`}</p>
            {constraintsLine(profile) ? <p>{constraintsLine(profile)}</p> : null}
          </div>
        </aside>
      </div>

      <div className={s.actions}>
        <Link href="/plan" className={`${ui.btn} ${ui.primary}`}>
          Build My Plan
          <ArrowRight size={18} weight="bold" aria-hidden />
        </Link>
        <Link href="/start" className={s.textLink}>
          Edit what I love
        </Link>
      </div>
    </main>
  );
}
