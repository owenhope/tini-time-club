import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Button } from "../core/Button.jsx";

export function EmptyState({ icon = "martini", title, body, action, onAction, style, ...rest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "36px 24px", ...style }} {...rest}>
      <span style={{ width: 64, height: 64, borderRadius: "var(--radius-pill)", background: "var(--green-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={30} color="var(--green-700)" />
      </span>
      <h3 style={{ font: "var(--type-h2)", letterSpacing: "var(--tracking-heading)" }}>{title}</h3>
      {body ? <p style={{ font: "var(--type-body)", color: "var(--text-muted)", maxWidth: "34ch" }}>{body}</p> : null}
      {action ? <Button tone="primary" onClick={onAction} style={{ marginTop: 6 }}>{action}</Button> : null}
    </div>
  );
}
