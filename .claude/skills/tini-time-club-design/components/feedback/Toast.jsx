import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Toast({ message, icon = "martini", tone = "ink", style, ...rest }) {
  const chart = tone === "chartreuse";
  return (
    <div
      role="status"
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "12px 18px",
        background: chart ? "var(--chartreuse-500)" : "var(--green-900)",
        color: chart ? "var(--green-700)" : "var(--chartreuse-500)",
        borderRadius: "var(--radius-pill)",
        boxShadow: "var(--shadow-raised)",
        font: "var(--weight-semibold) 14.5px/1.2 var(--font-body)",
        animation: "ttcToast var(--dur-slow) var(--ease-spring)",
        ...style,
      }}
      {...rest}
    >
      <style>{"@keyframes ttcToast{from{transform:translateY(10px) scale(.96);opacity:0}to{transform:none;opacity:1}}"}</style>
      <Icon name={icon} size={18} />
      {message}
    </div>
  );
}
