import React from "react";
import { IconButton } from "../core/IconButton.jsx";
import { Logo } from "../core/Logo.jsx";

export function AppBar({ title, showLogo, leadingIcon, onLeading, actions = [], tone = "light", assetBase = "../../assets/", style, ...rest }) {
  const ink = tone === "ink";
  const glass = tone === "glass";
  return (
    <header
      style={{
        display: "flex", alignItems: "center", gap: 8,
        minHeight: 56, padding: "8px 12px",
        background: ink ? "var(--surface-ink)" : glass ? "var(--glass-bg)" : "var(--surface-card)",
        backdropFilter: glass ? "var(--glass-blur)" : undefined,
        borderBottom: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
        ...style,
      }}
      {...rest}
    >
      {leadingIcon ? <IconButton icon={leadingIcon} label="Back" size="sm" tone={ink ? "onInk" : "ghost"} onClick={onLeading} /> : null}
      {showLogo ? <Logo tone={ink ? "chartreuse" : "green"} width={92} assetBase={assetBase} style={{ marginLeft: 4 }} /> : null}
      {title ? (
        <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)", color: ink ? "var(--text-on-ink)" : "var(--text-heading)", margin: 0 }}>{title}</h3>
      ) : null}
      <span style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {actions.map(a => (
          <IconButton key={a.icon} icon={a.icon} label={a.label} size="sm" tone={ink ? "onInk" : "ghost"} onClick={a.onClick} />
        ))}
      </div>
    </header>
  );
}
