import React from "react";
import { Icon } from "./Icon.jsx";

const SIZES = { sm: 34, md: 44, lg: 54 };

export function IconButton({ icon, label, tone = "ghost", size = "md", active, disabled, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const solid = tone === "primary";
  const onInk = tone === "onInk";
  const glass = tone === "glass";
  const px = SIZES[size];
  const fg = solid ? "var(--paper-050)" : onInk ? "var(--chartreuse-500)" : "var(--green-700)";
  let bg = "transparent";
  if (solid) bg = hover ? "var(--green-800)" : "var(--green-700)";
  else if (glass) bg = "var(--glass-bg)";
  else if (active) bg = "var(--chartreuse-500)";
  else if (hover) bg = onInk ? "rgba(242,255,113,.14)" : "var(--green-100)";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active ? true : undefined}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        width: px, height: px, display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: fg, background: bg,
        border: tone === "secondary" ? "2px solid var(--green-700)" : "2px solid transparent",
        borderRadius: "var(--radius-pill)",
        backdropFilter: glass ? "var(--glass-blur)" : undefined,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        transform: press && !disabled ? "scale(var(--press-scale))" : "none",
        transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={size === "sm" ? 18 : size === "lg" ? 26 : 22} />
    </button>
  );
}
