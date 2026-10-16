import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { TasteView } from "@/components/taste/TasteView";

export const metadata: Metadata = { title: "Your taste" };

export default function TastePage() {
  return (
    <>
      <SiteHeader variant="bare" items={[{ href: "/start", label: "Edit what I love" }]} />
      <TasteView />
    </>
  );
}
