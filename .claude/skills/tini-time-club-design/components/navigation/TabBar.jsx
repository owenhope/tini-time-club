import React from "react";
import { Icon } from "../core/Icon.jsx";

/* Fixed bottom app chrome: translucent glass over content, 5 tabs. */
export function TabBar({ items = [], value, onChange, style, ...rest }) {
  return (
    <nav
      style={{
        display: "flex", alignItems: "stretch",
        background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
        borderTop: "1px solid var(--line-hairline)",
        padding: "6px 4px 10px",
        ...style,
      }}
      {...rest}
    >
      {items.map(it => {
        const active = it.id === value;
        return (
          <button key={it.id} type="button" onClick={() => onChange && onChange(it.id)}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1, minHeight: "var(--tap-min)", border: "none", background: "transparent",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: active ? "var(--green-700)" : "var(--ink-500)", cursor: "pointer", padding: "6px 0",
              WebkitTapHighlightColor: "transparent",
            }}>
            <span style={{ position: "relative", display: "flex" }}>
              <Icon name={it.icon} size={26} />
              {it.dot ? <span style={{ position: "absolute", top: -1, right: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--pimento-500)" }} /> : null}
            </span>
            <span style={{ font: `var(--weight-${active ? "bold" : "medium"}) 10.5px/1 var(--font-body)`, letterSpacing: ".01em" }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
