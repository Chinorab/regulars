"use client";

import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
import ui from "@/components/ui/ui.module.css";
import { clearAll } from "@/lib/plan/store";

// Two step delete: the first press asks, the second deletes.
export function DeleteLocalData() {
  const [state, setState] = useState<"idle" | "confirm" | "done">("idle");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      {state === "confirm" ? (
        <>
          <button
            type="button"
            className={`${ui.btn} ${ui.primary}`}
            onClick={() => {
              clearAll();
              setState("done");
            }}
          >
            <Trash size={18} aria-hidden />
            Yes, Delete It
          </button>
          <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => setState("idle")}>
            Keep My Plan
          </button>
        </>
      ) : (
        <button type="button" className={`${ui.btn} ${ui.outline}`} onClick={() => setState("confirm")} disabled={state === "done"}>
          <Trash size={18} aria-hidden />
          Delete Everything on This Device
        </button>
      )}
      <p role="status" style={{ fontSize: 15, color: "var(--ink-muted)" }}>
        {state === "confirm" ? "This removes your plan, taste choices and check ins from this browser. It cannot be undone." : null}
        {state === "done" ? "Done. Your plan, taste choices and check ins are gone from this browser." : null}
      </p>
    </div>
  );
}
