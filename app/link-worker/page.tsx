import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { LinkWorkerView } from "@/components/linkworker/LinkWorkerView";

export const metadata: Metadata = {
  title: "Link worker mode",
  description: "Build a six week Connection Plan with a patient and print it as a large print sheet.",
};

export default function LinkWorkerPage() {
  return (
    <>
      <SiteHeader
        variant="bare"
        tag="Link worker mode"
        items={[
          { href: "/", label: "Exit" },
          { href: "/privacy", label: "Privacy" },
        ]}
      />
      <LinkWorkerView />
    </>
  );
}
