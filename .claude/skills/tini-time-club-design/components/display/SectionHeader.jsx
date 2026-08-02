import React from "react";
import { Icon } from "../core/Icon.jsx";

export function SectionHeader({ eyebrow, title, action, onAction, tone = "light", style, ...rest }) {
  const onInk = tone === "onInk";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, ...style }} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {eyebrow ? (
          <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: onInk ? "var(--chartreuse-500)" : "var(--green-500)" }}>{eyebrow}</span>
        ) : null}
        <h2 style={{ font: "var(--type-h2)", letterSpacing: "var(--tracking-heading)", color: onInk ? "var(--text-on-ink)" : "var(--text-heading)" }}>{title}</h2>
      </div>
      {action ? (
        <button type="button" onClick={onAction} style={{
          display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "transparent",
          font: "var(--weight-bold) 14px/1 var(--font-body)", color: onInk ? "var(--chartreuse-500)" : "var(--green-700)",
          cursor: "pointer", padding: "6px 0", whiteSpace: "nowrap",
        }}>
          {action}<Icon name="arrow-right" size={16} />
        </button>
      ) : null}
    </div>
  );
}
