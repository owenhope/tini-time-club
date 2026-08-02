import React from "react";

export function Card({ children, tone = "paper", interactive, padding = 20, style, onClick, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const onColour = tone === "onColour";
  const ink = tone === "ink";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: ink ? "var(--surface-ink)" : onColour ? "rgba(255,255,255,.92)" : "var(--surface-card)",
        color: ink ? "var(--text-on-ink)" : "var(--text-body)",
        border: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
        borderRadius: "var(--radius-card)",
        padding,
        boxShadow: onColour || ink ? "none" : (interactive && hover ? "var(--shadow-raised)" : "var(--shadow-card)"),
        transform: interactive && hover ? "translateY(-2px)" : "none",
        cursor: interactive ? "pointer" : undefined,
        transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
