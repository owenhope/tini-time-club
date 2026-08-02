import React from "react";
import { Icon } from "./Icon.jsx";

const H = { sm: "var(--control-h-sm)", md: "var(--control-h-md)", lg: "var(--control-h-lg)" };
const PAD = { sm: "0 14px", md: "0 20px", lg: "0 28px" };
const FS = { sm: 13, md: 15, lg: 17 };

const TONES = {
  primary:   { bg: "var(--green-700)", fg: "var(--paper-050)", bd: "transparent", hover: "var(--green-800)" },
  highlight: { bg: "var(--chartreuse-500)", fg: "var(--green-700)", bd: "transparent", hover: "var(--chartreuse-600)" },
  secondary: { bg: "transparent", fg: "var(--green-700)", bd: "var(--green-700)", hover: "var(--green-100)" },
  ghost:     { bg: "transparent", fg: "var(--green-700)", bd: "transparent", hover: "var(--green-100)" },
  onInk:     { bg: "var(--chartreuse-500)", fg: "var(--green-700)", bd: "transparent", hover: "var(--chartreuse-300)" },
};

export function Button({
  children, tone = "primary", size = "md", icon, iconAfter, block, disabled,
  type = "button", style, onClick, ...rest
}) {
  const t = TONES[tone] || TONES.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: block ? "flex" : "inline-flex",
        width: block ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: H[size],
        minHeight: size === "sm" ? undefined : "var(--tap-min)",
        padding: PAD[size],
        font: `var(--weight-bold) ${FS[size]}px/1 var(--font-body)`,
        letterSpacing: "-0.005em",
        color: t.fg,
        background: hover && !disabled ? t.hover : t.bg,
        border: `2px solid ${t.bd}`,
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        transform: press && !disabled ? "scale(var(--press-scale))" : "none",
        boxShadow: press && !disabled && (tone === "primary" || tone === "highlight" || tone === "onInk") ? "var(--shadow-inset-press)" : "none",
        transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 16 : 18} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={size === "sm" ? 16 : 18} /> : null}
    </button>
  );
}
