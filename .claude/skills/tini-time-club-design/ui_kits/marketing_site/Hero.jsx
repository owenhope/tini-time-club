const { Button, Logo, StickerBadge, Badge, Avatar } = window.TiniTimeClubDesignSystem_1636c5;

function Hero() {
  return (
    <section style={{ background: "var(--surface-ink-deep)", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "72px var(--gutter-page) 88px", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start" }}>
          <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--chartreuse-500)" }}>The martini social network</span>
          <h1 style={{ font: "var(--type-display-1)", letterSpacing: "var(--tracking-display)", color: "var(--paper-050)", textTransform: "lowercase", margin: 0 }}>
            discover the world's<br />best martinis
          </h1>
          <p style={{ font: "var(--type-body-lg)", color: "var(--green-300)", maxWidth: "42ch" }}>
            Join martini lovers around the globe who use Tini Time Club to discover, review and share the best martinis near and far.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Button tone="onInk" size="lg" icon="apple">Get the app</Button>
            <Button tone="ghost" size="lg" iconAfter="arrow-right" style={{ color: "var(--paper-050)" }}>Browse bars</Button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <div style={{ display: "flex" }}>
              {["Nadia Fereday", "Milo Grant", "Ines Vo", "Theo Marsh"].map((n, i) => (
                <Avatar key={n} name={n} size={34} style={{ marginLeft: i ? -10 : 0, boxShadow: "0 0 0 2px var(--green-900)" }} />
              ))}
            </div>
            <span style={{ font: "var(--type-body-sm)", color: "var(--green-300)" }}>99.9k verdicts poured so far</span>
          </div>
        </div>

        <div style={{ position: "relative", justifySelf: "center" }}>
          <div style={{
            width: 320, height: 640, borderRadius: 40, border: "9px solid #16181A",
            background: "var(--surface-ink)", overflow: "hidden", boxShadow: "var(--shadow-overlay)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "26px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <Logo tone="chartreuse" width={92} assetBase="../../assets/" />
            </div>
            <div style={{ padding: "0 20px 16px" }}>
              <h2 style={{ font: "var(--weight-black) 27px/0.92 var(--font-display)", letterSpacing: "var(--tracking-display)", color: "var(--paper-050)", textTransform: "lowercase" }}>
                clock out,<br />coupe up 🍸
              </h2>
            </div>
            <div style={{ flex: 1, backgroundImage: "url(../../assets/photo-martini-lamp.jpg)", backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "var(--scrim-bottom)" }} />
              <div style={{ position: "absolute", left: 16, bottom: 16, right: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge tone="chartreuse">Bar Basso</Badge>
                <Badge tone="hot" icon="flame">Trending</Badge>
              </div>
            </div>
          </div>
          <StickerBadge size={128} tilt={-10} style={{ position: "absolute", left: -38, bottom: 74 }} />
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { Hero });
