import React from "react";
import { Icon } from "../core/Icon.jsx";

export function SearchField({ value, onChange, onClear, placeholder = "Search bars, martinis, flavours", tone = "light", style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const onInk = tone === "onInk";
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        height: "var(--control-h-md)", padding: "0 14px",
        background: onInk ? "rgba(242,255,113,.10)" : "var(--surface-card)",
        border: `2px solid ${focus ? (onInk ? "var(--chartreuse-500)" : "var(--green-700)") : (onInk ? "var(--line-on-ink)" : "var(--line-hairline)")}`,
        borderRadius: "var(--radius-pill)",
        transition: "border-color var(--dur-fast) var(--ease-out)",
        ...style,
      }}
    >
      <Icon name="search" size={20} color={onInk ? "var(--chartreuse-500)" : "var(--green-500)"} />
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
          font: "var(--type-body)", color: onInk ? "var(--paper-050)" : "var(--text-body)",
        }}
        {...rest}
      />
      {value ? (
        <button type="button" aria-label="Clear" onClick={onClear} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex" }}>
          <Icon name="x" size={18} color={onInk ? "var(--chartreuse-500)" : "var(--green-500)"} />
        </button>
      ) : null}
    </div>
  );
}
