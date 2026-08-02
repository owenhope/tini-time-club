import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Select({ label, value, onChange, options = [], disabled, id, style, ...rest }) {
  const rid = id || React.useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label ? (
        <label htmlFor={rid} style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</label>
      ) : null}
      <div style={{ position: "relative", display: "flex", opacity: disabled ? 0.38 : 1 }}>
        <select
          id={rid} value={value} onChange={onChange} disabled={disabled}
          style={{
            appearance: "none", width: "100%", height: "var(--control-h-md)",
            padding: "0 40px 0 14px", font: "var(--type-body)", color: "var(--text-body)",
            background: "var(--surface-card)", border: "2px solid var(--line-hairline)",
            borderRadius: "var(--radius-sm)", outline: "none", cursor: "pointer",
          }}
          {...rest}
        >
          {options.map(o => {
            const v = typeof o === "string" ? o : o.value;
            const l = typeof o === "string" ? o : o.label;
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
        <Icon name="chevron-down" size={20} color="var(--green-500)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}
