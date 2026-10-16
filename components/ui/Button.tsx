import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import s from "./ui.module.css";

type Variant = "primary" | "outline" | "ghost";

function cls(variant: Variant, small?: boolean, extra?: string) {
  return [s.btn, s[variant], small ? s.small : "", extra ?? ""].filter(Boolean).join(" ");
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  arrow,
  small,
  className,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  arrow?: boolean;
  small?: boolean;
} & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href} className={cls(variant, small, className)} {...rest}>
      {children}
      {arrow ? <ArrowRight size={18} weight="bold" aria-hidden /> : null}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  arrow,
  small,
  className,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  arrow?: boolean;
  small?: boolean;
} & ComponentProps<"button">) {
  return (
    <button type={type} className={cls(variant, small, className)} {...rest}>
      {children}
      {arrow ? <ArrowRight size={18} weight="bold" aria-hidden /> : null}
    </button>
  );
}
