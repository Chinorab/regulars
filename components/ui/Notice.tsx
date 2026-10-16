import type { ReactNode } from "react";
import { WarningCircle, Info } from "@phosphor-icons/react/dist/ssr";
import s from "./ui.module.css";

// Honest status panel used for errors, empty results and quota messages.
export function Notice({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "error";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const Icon = tone === "error" ? WarningCircle : Info;
  return (
    <div
      className={`${s.notice} ${tone === "error" ? s.noticeError : ""}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={26} weight="duotone" color="var(--clay)" aria-hidden style={{ flex: "none", marginTop: 2 }} />
      <div className={s.noticeBody}>
        <p className={s.noticeTitle}>{title}</p>
        {children}
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ width = "100%", height = 20, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <div className={s.skeleton} aria-hidden style={{ width, height, borderRadius: radius }} />;
}
