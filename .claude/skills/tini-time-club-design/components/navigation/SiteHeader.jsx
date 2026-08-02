import React from "react";
import { Logo } from "../core/Logo.jsx";
import { Button } from "../core/Button.jsx";

export function SiteHeader({ links = [], tone = "ink", cta = "Get the app", onCta, assetBase = "../../assets/", style, ...rest }) {
  const ink = tone === "ink";
  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 20,
        background: ink ? "var(--surface-ink-deep)" : "var(--surface-brand)",
        borderBottom: `1px solid ${ink ? "var(--line-on-ink)" : "rgba(51,102,84,.18)"}`,
        ...style,
      }}
      {...rest}
    >
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "16px var(--gutter-page)", display: "flex", alignItems: "center", gap: 32 }}>
        <Logo tone={ink ? "chartreuse" : "green"} width={104} assetBase={assetBase} />
        <nav style={{ display: "flex", gap: 26, flex: 1 }}>
          {links.map(l => (
            <a key={l} href="#" style={{ font: "var(--weight-semibold) 15px/1 var(--font-body)", color: ink ? "var(--paper-050)" : "var(--green-700)", textDecoration: "none" }}>{l}</a>
          ))}
        </nav>
        <Button tone={ink ? "onInk" : "primary"} size="sm" onClick={onCta}>{cta}</Button>
      </div>
    </header>
  );
}
