import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Input({ label, hint, error, icon, value, onChange, placeholder, type = "text", multiline, rows = 4, disabled, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const rid = id || React.useId();
  const border = error ? "var(--accent-danger)" : focus ? "var(--green-700)" : "var(--line-hairline)";
  const field = {
    width: "100%",
    minHeight: multiline ? undefined : "var(--control-h-md)",
    padding: multiline ? "12px 14px" : icon ? "0 14px 0 42px" : "0 14px",
    font: "var(--type-body)",
    color: "var(--text-body)",
    background: "var(--surface-card)",
    border: `2px solid ${border}`,
    borderRadius: multiline ? "var(--radius-sm)" : "var(--radius-sm)",
    outline: "none",
    resize: multiline ? "vertical" : undefined,
    lineHeight: multiline ? 1.55 : undefined,
    transition: "border-color var(--dur-fast) var(--ease-out)",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label ? (
        <label htmlFor={rid} style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</label>
      ) : null}
      <div style={{ position: "relative", display: "flex", opacity: disabled ? 0.38 : 1 }}>
        {icon && !multiline ? (
          <Icon name={icon} size={20} color="var(--green-500)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        ) : null}
        {multiline ? (
          <textarea id={rid} rows={rows} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={field} {...rest} />
        ) : (
          <input id={rid} type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={field} {...rest} />
        )}
      </div>
      {error || hint ? (
        <span style={{ font: "var(--type-caption)", color: error ? "var(--accent-danger)" : "var(--text-muted)" }}>{error || hint}</span>
      ) : null}
    </div>
  );
}
