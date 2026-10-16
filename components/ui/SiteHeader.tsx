import Link from "next/link";
import { Mark } from "./Mark";
import { NavLinks, type NavItem } from "./NavLinks";
import s from "./ui.module.css";

const MARKETING: NavItem[] = [
  { href: "/#how", label: "How It Works" },
  { href: "/link-worker", label: "For Link Workers" },
  { href: "/privacy", label: "Privacy" },
];

const APP: NavItem[] = [
  { href: "/plan", label: "My Plan" },
  { href: "/checkin", label: "Check In" },
  { href: "/taste", label: "My Taste" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteHeader({
  variant = "marketing",
  tag,
  items,
}: {
  variant?: "marketing" | "app" | "bare";
  tag?: string;
  items?: NavItem[];
}) {
  const nav = items ?? (variant === "app" ? APP : variant === "marketing" ? MARKETING : []);
  return (
    <header className={s.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link href="/" className={s.brand}>
          <Mark />
          <span className={s.brandName} translate="no">Regulars</span>
        </Link>
        {tag ? <span className={s.brandTag}>{tag}</span> : null}
      </div>
      {nav.length > 0 ? <NavLinks items={nav} /> : null}
    </header>
  );
}
