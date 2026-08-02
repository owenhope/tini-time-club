import React from "react";

export function Radio({ label, checked, onChange, name, value, disabled, style, ...rest }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.38 : 1, minHeight: "var(--tap-min)", ...style }}>
      <input type="radio" name={name} value={value} checked={!!checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} {...rest} />
      <span style={{
        width: 22, height: 22, flex: "0 0 auto", borderRadius: "var(--radius-pill)",
        border: "2px solid var(--green-700)", background: "var(--surface-card)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked ? <span style={{ width: 11, height: 11, borderRadius: "var(--radius-pill)", background: "var(--green-700)" }} /> : null}
      </span>
      <span style={{ font: "var(--type-body)" }}>{label}</span>
    </label>
  );
}
