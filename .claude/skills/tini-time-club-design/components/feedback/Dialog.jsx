import React from "react";
import { Button } from "../core/Button.jsx";
import { IconButton } from "../core/IconButton.jsx";

export function Dialog({ open, title, children, confirm, cancel = "Never mind", onConfirm, onClose, style, ...rest }) {
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,26,23,.42)" }} />
      <div
        role="dialog"
        aria-label={title}
        style={{
          position: "relative", width: "100%", maxWidth: 420,
          background: "var(--surface-card)", borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-overlay)", padding: 24,
          display: "flex", flexDirection: "column", gap: 14,
          ...style,
        }}
        {...rest}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <h3 style={{ font: "var(--type-h2)", letterSpacing: "var(--tracking-heading)", flex: 1 }}>{title}</h3>
          <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
        </div>
        {children ? <div style={{ font: "var(--type-body)", color: "var(--text-muted)" }}>{children}</div> : null}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <Button tone="ghost" onClick={onClose}>{cancel}</Button>
          {confirm ? <Button tone="primary" onClick={onConfirm}>{confirm}</Button> : null}
        </div>
      </div>
    </div>
  );
}
