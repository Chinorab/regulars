import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { CheckinView } from "@/components/checkin/CheckinView";

export const metadata: Metadata = { title: "Check in" };

export default function CheckinPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <CheckinView />
    </>
  );
}
