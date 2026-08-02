import React from "react";
import { Avatar } from "../display/Avatar.jsx";
import { RatingPips } from "../display/RatingPips.jsx";
import { Badge } from "../display/Badge.jsx";
import { Icon } from "../core/Icon.jsx";

export function ReviewCard({ author, rank, when, drink, bar, rating, notes, tags = [], image, likes = 0, comments = 0, liked, onLike, style, ...rest }) {
  return (
    <article
      style={{
        background: "var(--surface-card)", border: "1px solid var(--line-hairline)",
        borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)",
        padding: 16, display: "flex", flexDirection: "column", gap: 12, ...style,
      }}
      {...rest}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={author} size={42} ring={!!rank} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ font: "var(--type-h4)", color: "var(--text-heading)", letterSpacing: "var(--tracking-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{author}</span>
            {rank ? <Badge tone="chartreuse">{rank}</Badge> : null}
          </div>
          <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{when}</span>
        </div>
        <RatingPips value={rating} />
      </header>

      <div>
        <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)" }}>{drink}</h3>
        <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", marginTop: 2 }}>{bar}</p>
      </div>

      {image ? (
        <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", aspectRatio: "16 / 10", backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      ) : null}

      {notes ? <p style={{ font: "var(--type-body)", textWrap: "pretty" }}>{notes}</p> : null}

      {tags.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map(t => <Badge key={t} tone="muted">{t}</Badge>)}
        </div>
      ) : null}

      <footer style={{ display: "flex", alignItems: "center", gap: 18, borderTop: "1px solid var(--line-hairline)", paddingTop: 10 }}>
        <button type="button" onClick={onLike} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", padding: "4px 0", font: "var(--weight-semibold) 13.5px/1 var(--font-body)", color: liked ? "var(--pimento-500)" : "var(--text-muted)" }}>
          <Icon name="heart" size={17} />{likes}
        </button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13.5px/1 var(--font-body)", color: "var(--text-muted)" }}>
          <Icon name="message-circle" size={17} />{comments}
        </span>
        <span style={{ flex: 1 }} />
        <Icon name="share-2" size={17} color="var(--text-muted)" />
      </footer>
    </article>
  );
}
