import Link from "next/link";
import { Mark } from "./Mark";
import s from "./ui.module.css";

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mark size={22} />
          <span translate="no">© 2026 Regulars</span>
        </div>
        <div className={s.footerLinks}>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/Chinorab/regulars">Source code</a>
          <a href="https://www.qloo.com">Taste data by Qloo</a>
        </div>
      </div>
    </footer>
  );
}
