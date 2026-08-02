import React from "react";

export function Tooltip({ label, children, placement = "top", style, ...rest }) {
  const [show, setShow] = React.useState(false);
  const pos = placement === "bottom"
    ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
  return (
    <span
      style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      {...rest}
    >
      {children}
      {show ? (
        <span role="tooltip" style={{
          position: "absolute", ...pos, zIndex: 30,
          padding: "6px 10px", whiteSpace: "nowrap",
          background: "var(--green-900)", color: "var(--paper-050)",
          font: "var(--type-caption)", borderRadius: "var(--radius-xs)",
          boxShadow: "var(--shadow-sm)", pointerEvents: "none",
        }}>{label}</span>
      ) : null}
    </span>
  );
}
