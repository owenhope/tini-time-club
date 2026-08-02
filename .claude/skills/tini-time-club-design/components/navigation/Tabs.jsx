import React from "react";

/* Segmented pill tabs with a sliding chartreuse indicator. */
export function Tabs({ items = [], value, onChange, tone = "light", style, ...rest }) {
  const ink = tone === "onInk";
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex", gap: 4, padding: 4,
        background: ink ? "rgba(242,255,113,.10)" : "var(--surface-card-sunk)",
        border: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
        borderRadius: "var(--radius-pill)",
        ...style,
      }}
      {...rest}
    >
      {items.map(it => {
        const id = typeof it === "string" ? it : it.id;
        const label = typeof it === "string" ? it : it.label;
        const active = id === value;
        return (
          <button key={id} type="button" role="tab" aria-selected={active} onClick={() => onChange && onChange(id)}
            style={{
              height: 34, padding: "0 16px", border: "none", borderRadius: "var(--radius-pill)",
              font: `var(--weight-${active ? "bold" : "semibold"}) 13.5px/1 var(--font-body)`,
              color: active ? "var(--green-700)" : ink ? "var(--text-on-ink-muted)" : "var(--text-muted)",
              background: active ? "var(--chartreuse-500)" : "transparent",
              cursor: "pointer",
              transition: "background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)",
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
