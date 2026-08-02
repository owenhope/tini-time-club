import React from "react";
import { Icon } from "../core/Icon.jsx";

export function ListRow({ title, subtitle, leading, trailing, chevron, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        minHeight: "var(--tap-min)", padding: "12px 4px",
        borderBottom: "1px solid var(--line-hairline)",
        background: hover && onClick ? "var(--green-100)" : "transparent",
        cursor: onClick ? "pointer" : undefined,
        transition: "background var(--dur-fast) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {leading}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "var(--type-h4)", color: "var(--text-heading)", letterSpacing: "var(--tracking-heading)" }}>{title}</span>
        {subtitle ? <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{subtitle}</span> : null}
      </div>
      {trailing}
      {chevron ? <Icon name="chevron-right" size={20} color="var(--green-300)" /> : null}
    </div>
  );
}
