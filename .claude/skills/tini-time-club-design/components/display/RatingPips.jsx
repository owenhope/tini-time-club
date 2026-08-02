import React from "react";

/* The brand's own rating device: the olive from the wordmark's full stop.
   An olive-green ellipse with an off-centre pimento circle. */
function Olive({ size, filled }) {
  return (
    <span style={{
      width: size * 0.84, height: size, borderRadius: "50%",
      background: filled ? "var(--green-700)" : "transparent",
      border: filled ? "none" : `2px solid var(--green-300)`,
      position: "relative", display: "inline-block", flex: "0 0 auto",
    }}>
      {filled ? (
        <span style={{
          position: "absolute", top: "16%", right: "12%",
          width: size * 0.3, height: size * 0.3, borderRadius: "50%",
          background: "var(--pimento-500)",
        }} />
      ) : null}
    </span>
  );
}

export function RatingPips({ value = 0, max = 5, size = 16, showValue, onRate, style, ...rest }) {
  const pips = [];
  for (let i = 1; i <= max; i++) {
    pips.push(
      onRate ? (
        <button key={i} type="button" aria-label={`Rate ${i}`} onClick={() => onRate(i)}
          style={{ border: "none", background: "transparent", padding: 2, cursor: "pointer", display: "flex", lineHeight: 0 }}>
          <Olive size={size} filled={i <= Math.round(value)} />
        </button>
      ) : <Olive key={i} size={size} filled={i <= Math.round(value)} />
    );
  }
  return (
    <span role="img" aria-label={`${value} out of ${max}`} style={{ display: "inline-flex", alignItems: "center", gap: onRate ? 2 : size * 0.28, ...style }} {...rest}>
      {pips}
      {showValue ? (
        <span style={{ font: "var(--type-mono)", letterSpacing: "var(--tracking-mono)", color: "var(--text-muted)", marginLeft: 8 }}>
          {Number(value).toFixed(1)}
        </span>
      ) : null}
    </span>
  );
}
