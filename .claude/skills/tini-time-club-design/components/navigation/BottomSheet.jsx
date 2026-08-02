import React from "react";
import { IconButton } from "../core/IconButton.jsx";

export function BottomSheet({ open, title, children, onClose, style, ...rest }) {
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 40 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,26,23,.42)" }} />
      <div
        style={{
          position: "relative",
          background: "var(--surface-card)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          boxShadow: "var(--shadow-overlay)",
          padding: "10px 20px 24px",
          animation: "ttcSheetUp var(--dur-slow) var(--ease-out)",
          maxHeight: "86%", overflowY: "auto",
          ...style,
        }}
        {...rest}
      >
        <style>{"@keyframes ttcSheetUp{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}"}</style>
        <div style={{ width: 42, height: 4, borderRadius: 2, background: "var(--paper-300)", margin: "0 auto 12px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <h3 style={{ font: "var(--type-h2)", letterSpacing: "var(--tracking-heading)", flex: 1 }}>{title}</h3>
          <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
