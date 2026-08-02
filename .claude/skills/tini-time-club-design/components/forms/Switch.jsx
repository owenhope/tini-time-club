import React from "react";

export function Switch({ label, checked, onChange, disabled, style, ...rest }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.38 : 1, minHeight: "var(--tap-min)", ...style }}>
      <input type="checkbox" role="switch" checked={!!checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} {...rest} />
      <span style={{
        width: 48, height: 28, flex: "0 0 auto", borderRadius: "var(--radius-pill)",
        background: checked ? "var(--green-700)" : "var(--paper-300)",
        padding: 3, display: "inline-flex", alignItems: "center",
        transition: "background var(--dur-base) var(--ease-out)",
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: "var(--radius-pill)",
          background: checked ? "var(--chartreuse-500)" : "var(--paper-000)",
          boxShadow: "var(--shadow-sm)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: "transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)",
        }} />
      </span>
      {label ? <span style={{ font: "var(--type-body)" }}>{label}</span> : null}
    </label>
  );
}
