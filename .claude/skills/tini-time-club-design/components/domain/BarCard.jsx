import React from "react";
import { RatingPips } from "../display/RatingPips.jsx";
import { Badge } from "../display/Badge.jsx";
import { Icon } from "../core/Icon.jsx";

export function BarCard({ name, area, distance, rating, openNow, regular, image, layout = "row", onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const row = layout === "row";
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", flexDirection: row ? "row" : "column", gap: row ? 14 : 0,
        alignItems: row ? "center" : "stretch",
        background: "var(--surface-card)", border: "1px solid var(--line-hairline)",
        borderRadius: "var(--radius-card)", overflow: "hidden",
        padding: row ? 12 : 0, cursor: onClick ? "pointer" : undefined,
        boxShadow: hover ? "var(--shadow-raised)" : "var(--shadow-card)",
        transition: "box-shadow var(--dur-base) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      <div style={{
        flex: row ? "0 0 auto" : undefined,
        width: row ? 74 : "100%", height: row ? 74 : 132,
        borderRadius: row ? "var(--radius-md)" : 0,
        background: "var(--green-900)",
        backgroundImage: image ? `url(${image})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
      }} />
      <div style={{ flex: 1, minWidth: 0, padding: row ? 0 : 16, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</h3>
          {regular ? <Badge tone="green">Regular</Badge> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
          <Icon name="map-pin" size={15} color="var(--green-500)" />
          <span>{area}</span>
          {distance ? <span className="ttc-mono" style={{ font: "var(--type-mono)" }}>· {distance}</span> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RatingPips value={rating} showValue />
          <span style={{ font: "var(--type-caption)", color: openNow ? "var(--green-500)" : "var(--text-muted)", fontWeight: 700 }}>
            {openNow ? "Open now" : "Closed"}
          </span>
        </div>
      </div>
    </article>
  );
}
