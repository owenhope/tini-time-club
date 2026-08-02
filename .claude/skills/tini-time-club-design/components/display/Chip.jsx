import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Chip({ children, selected, icon, onClick, tone = "light", style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const onInk = tone === "onInk";
  const bg = selected ? "var(--chartreuse-500)" : onInk ? "rgba(242,255,113,.10)" : hover ? "var(--green-100)" : "var(--surface-card)";
  const fg = selected ? "var(--green-700)" : onInk ? "var(--paper-050)" : "var(--green-700)";
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: "var(--control-h-sm)", padding: "0 14px",
        font: "var(--weight-semibold) 13px/1 var(--font-body)",
        color: fg, background: bg,
        border: `2px solid ${selected ? "var(--green-700)" : onInk ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
        borderRadius: "var(--radius-pill)", cursor: "pointer", whiteSpace: "nowrap",
        transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}
