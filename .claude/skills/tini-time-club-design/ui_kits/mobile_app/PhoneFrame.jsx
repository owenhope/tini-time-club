const PhoneFrame = ({ children, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
    <div style={{
      width: 390, height: 780, background: "var(--paper-050)",
      borderRadius: 42, border: "10px solid #16181A", overflow: "hidden",
      position: "relative", boxShadow: "var(--shadow-raised)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 104, height: 26, borderRadius: 14, background: "#16181A", zIndex: 60 }} />
      {children}
    </div>
    {label ? <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span> : null}
  </div>
);
Object.assign(window, { PhoneFrame });
