import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Checkbox({ label, checked, onChange, disabled, style, ...rest }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.38 : 1, minHeight: "var(--tap-min)", ...style }}>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} {...rest} />
      <span style={{
        width: 22, height: 22, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-xs)",
        border: `2px solid var(--green-700)`,
        background: checked ? "var(--green-700)" : "var(--surface-card)",
        transition: "background var(--dur-fast) var(--ease-out)",
      }}>
        {checked ? <Icon name="check" size={16} color="var(--chartreuse-500)" /> : null}
      </span>
      <span style={{ font: "var(--type-body)" }}>{label}</span>
    </label>
  );
}
