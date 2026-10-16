import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { CompareView } from "@/components/compare/CompareView";

export const metadata: Metadata = { title: "Without Qloo, with Qloo" };

export default function ComparePage() {
  return (
    <>
      <SiteHeader variant="app" />
      <CompareView />
      <SiteFooter />
    </>
  );
}
