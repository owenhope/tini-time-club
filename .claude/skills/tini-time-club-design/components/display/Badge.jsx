import React from "react";
import { Icon } from "../core/Icon.jsx";

const TONES = {
  green: { bg: "var(--green-700)", fg: "var(--paper-050)" },
  chartreuse: { bg: "var(--chartreuse-500)", fg: "var(--green-700)" },
  purple: { bg: "var(--purple-500)", fg: "var(--green-700)" },
  hot: { bg: "var(--pimento-500)", fg: "var(--paper-050)" },
  outline: { bg: "transparent", fg: "var(--green-700)" },
  muted: { bg: "var(--green-100)", fg: "var(--green-700)" },
};

export function Badge({ children, tone = "green", icon, style, ...rest }) {
  const t = TONES[tone] || TONES.green;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        height: 24, padding: "0 10px",
        font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
        color: t.fg, background: t.bg,
        border: tone === "outline" ? "1.5px solid var(--green-700)" : "1.5px solid transparent",
        borderRadius: "var(--radius-pill)", whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}
