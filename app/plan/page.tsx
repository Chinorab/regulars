import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { PlanView } from "@/components/plan/PlanView";

export const metadata: Metadata = { title: "Your Connection Plan" };

export default function PlanPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <PlanView />
      <SiteFooter />
    </>
  );
}
