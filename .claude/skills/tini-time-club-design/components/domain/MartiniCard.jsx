import React from "react";
import { RatingPips } from "../display/RatingPips.jsx";
import { Badge } from "../display/Badge.jsx";
import { IconButton } from "../core/IconButton.jsx";

export function MartiniCard({ name, bar, city, rating, reviews, spirit, image, trending, saved, onSave, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface-card)", border: "1px solid var(--line-hairline)",
        borderRadius: "var(--radius-card)", overflow: "hidden", cursor: onClick ? "pointer" : undefined,
        boxShadow: hover ? "var(--shadow-raised)" : "var(--shadow-card)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--green-900)", backgroundImage: image ? `url(${image})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "var(--scrim-bottom)" }} />
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          {trending ? <Badge tone="hot" icon="flame">Trending</Badge> : null}
          {spirit ? <Badge tone="chartreuse">{spirit}</Badge> : null}
        </div>
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          <IconButton icon={saved ? "bookmark-check" : "bookmark"} label="Save" tone="glass" size="sm" onClick={e => { e.stopPropagation(); onSave && onSave(); }} />
        </div>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)" }}>{name}</h3>
        <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{bar}{city ? ` · ${city}` : ""}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
          <RatingPips value={rating} showValue />
          {reviews != null ? <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{reviews} reviews</span> : null}
        </div>
      </div>
    </article>
  );
}
