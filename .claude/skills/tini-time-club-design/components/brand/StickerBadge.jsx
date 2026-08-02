import React from "react";

/* Inspiration motif: circular sticker with text set around the circle,
   pinned at a slight angle over photography or a colour block.
   Pass `src` to use the supplied "MAKE IT DIRTY" lockup instead of live text. */
export function StickerBadge({
  topText = "MAKE IT", bottomText = "DIRTY", src, size = 132,
  bg = "var(--chartreuse-500)", fg = "var(--green-700)", tilt = -8, style, ...rest
}) {
  const rid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  if (src) {
    return <img src={src} alt={`${topText} ${bottomText}`} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", transform: `rotate(${tilt}deg)`, ...style }} {...rest} />;
  }
  return (
    <span style={{ display: "inline-block", width: size, height: size, transform: `rotate(${tilt}deg)`, ...style }} {...rest}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${topText} ${bottomText}`}>
        <circle cx="100" cy="100" r="100" fill={bg} />
        <defs>
          <path id={"t" + rid} d="M100,100 m-72,0 a72,72 0 1,1 144,0" fill="none" />
          <path id={"b" + rid} d="M100,100 m-64,0 a64,64 0 1,0 128,0" fill="none" />
        </defs>
        <text fill={fg} style={{ font: "900 25px var(--font-display)", letterSpacing: "3px" }}>
          <textPath href={"#t" + rid} startOffset="50%" textAnchor="middle">{topText}</textPath>
        </text>
        <text fill={fg} style={{ font: "900 25px var(--font-display)", letterSpacing: "3px" }}>
          <textPath href={"#b" + rid} startOffset="50%" textAnchor="middle">{bottomText}</textPath>
        </text>
        <ellipse cx="100" cy="100" rx="17" ry="21" fill="var(--green-800)" />
        <circle cx="106" cy="93" r="7" fill="var(--pimento-pink-500)" />
      </svg>
    </span>
  );
}
