"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./ui.module.css";

export type NavItem = { href: string; label: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className={s.nav} aria-label="Main">
      {items.map((item) => {
        const path = item.href.split("#")[0] || "/";
        const current = !item.href.includes("#") && pathname === path;
        return (
          <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
