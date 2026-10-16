import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { SAMPLES } from "@/content/samples";

export const metadata: Metadata = { title: "Tell us about you" };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const { sample } = await searchParams;
  const preset = SAMPLES.find((s) => s.id === sample);
  return (
    <>
      <SiteHeader
        variant="bare"
        items={[{ href: "/privacy", label: "What we keep" }]}
      />
      {preset ? (
        <p className="page" style={{ maxWidth: "var(--read-max)", fontSize: 15, color: "var(--ink-muted)" }}>
          Sample profile: {preset.who}. Every result below is looked up live. <Link href="/start">Start blank</Link>
        </p>
      ) : null}
      <IntakeForm
        key={preset?.id ?? "own"}
        initial={
          preset
            ? {
                loves: preset.loves,
                location: preset.location,
                budget: preset.budget,
                evenings: preset.evenings,
                noAlcohol: preset.noAlcohol,
                socialEase: preset.socialEase,
                sample: preset.id,
              }
            : undefined
        }
      />
    </>
  );
}
