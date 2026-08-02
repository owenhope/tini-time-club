import React from "react";

/* Inspiration motif: a bento of rounded blocks in alternating brand tones —
   stats, photography, category pills, logo lockup. */
const TONES = {
  green: { background: "var(--green-700)", color: "var(--paper-050)" },
  greenDeep: { background: "var(--green-900)", color: "var(--chartreuse-500)" },
  chartreuse: { background: "var(--chartreuse-500)", color: "var(--green-700)" },
  purple: { background: "var(--purple-500)", color: "var(--green-700)" },
  paper: { background: "var(--paper-100)", color: "var(--green-700)" },
  photo: { background: "var(--green-900)", color: "var(--paper-050)" },
};

export function BentoGrid({ children, columns = 2, gap = 14, style, ...rest }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap, gridAutoRows: "minmax(90px, auto)", ...style }} {...rest}>
      {children}
    </div>
  );
}

export function BentoTile({ children, tone = "green", span = 1, rowSpan = 1, image, padding = 22, style, ...rest }) {
  const t = TONES[tone] || TONES.green;
  return (
    <div
      style={{
        ...t,
        gridColumn: `span ${span}`,
        gridRow: `span ${rowSpan}`,
        borderRadius: "var(--radius-xl)",
        padding: image ? 0 : padding,
        overflow: "hidden",
        position: "relative",
        display: "flex", flexDirection: "column", justifyContent: "center",
        backgroundImage: image ? `url(${image})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
