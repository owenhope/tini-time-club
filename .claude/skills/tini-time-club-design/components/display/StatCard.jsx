import React from "react";

export function StatCard({ value, label, tone = "paper", style, ...rest }) {
  const ink = tone === "ink";
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2, padding: "14px 16px",
      background: ink ? "rgba(242,255,113,.10)" : "var(--surface-card)",
      border: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
      borderRadius: "var(--radius-md)", ...style,
    }} {...rest}>
      <span style={{ font: "var(--type-display-3)", letterSpacing: "var(--tracking-display)", color: ink ? "var(--chartreuse-500)" : "var(--text-heading)" }}>{value}</span>
      <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: ink ? "var(--text-on-ink-muted)" : "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
