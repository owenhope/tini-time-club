import React from "react";

const TONES = {
  chartreuse: { bg: "var(--chartreuse-500)", fg: "var(--green-700)" },
  green: { bg: "var(--green-700)", fg: "var(--paper-050)" },
  greenDeep: { bg: "var(--green-900)", fg: "var(--chartreuse-500)" },
  purple: { bg: "var(--purple-500)", fg: "var(--green-700)" },
  paper: { bg: "var(--paper-050)", fg: "var(--green-700)" },
};

/* Inspiration motif: heavy lozenge labels stacked with alternating tilt. */
export function TiltPill({ children, tone = "chartreuse", tilt = -3, size = 40, style, ...rest }) {
  const t = TONES[tone] || TONES.chartreuse;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: `${Math.round(size * 0.34)}px ${Math.round(size * 0.85)}px`,
        background: t.bg, color: t.fg,
        font: `var(--weight-black) ${size}px/1 var(--font-display)`,
        letterSpacing: "var(--tracking-display)",
        borderRadius: "var(--radius-pill)",
        transform: `rotate(${tilt}deg)`,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}

export function TiltPillStack({ items = [], tones = ["chartreuse", "green", "paper", "chartreuse"], size = 40, gap = 14, style, ...rest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap, ...style }} {...rest}>
      {items.map((label, i) => (
        <TiltPill key={label} tone={tones[i % tones.length]} tilt={i % 2 ? 3 : -3} size={size}
          style={{ marginLeft: i % 2 ? Math.round(size * 0.9) : 0 }}>
          {label}
        </TiltPill>
      ))}
    </div>
  );
}
