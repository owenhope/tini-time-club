import React from "react";

export function Avatar({ src, name = "", size = 40, ring, style, ...rest }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <span
      title={name || undefined}
      style={{
        width: size, height: size, flex: "0 0 auto", borderRadius: "var(--radius-pill)",
        background: "var(--purple-500)", color: "var(--green-700)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        font: `var(--weight-black) ${Math.round(size * 0.38)}px/1 var(--font-display)`,
        letterSpacing: "-0.02em", overflow: "hidden",
        boxShadow: ring ? "0 0 0 2px var(--chartreuse-500), 0 0 0 4px var(--green-700)" : "none",
        ...style,
      }}
      {...rest}
    >
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </span>
  );
}
