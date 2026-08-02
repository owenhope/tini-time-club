const { AppBar, Badge, RatingPips, Button, Tabs, MartiniCard, ReviewCard, StatCard, StickerBadge, IconButton } = window.TiniTimeClubDesignSystem_1636c5;

function BarScreen({ onBack, onCompose }) {
  const D = window.TTC_DATA;
  const [tab, setTab] = React.useState("Menu");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ position: "relative", height: 260, backgroundImage: "url(../../assets/photo-martini-lamp.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "var(--scrim-bottom)" }} />
          <div style={{ position: "absolute", top: 42, left: 12, right: 12, display: "flex", gap: 8 }}>
            <IconButton icon="chevron-left" label="Back" tone="glass" size="sm" onClick={onBack} />
            <span style={{ flex: 1 }} />
            <IconButton icon="share-2" label="Share" tone="glass" size="sm" />
            <IconButton icon="bookmark" label="Save" tone="glass" size="sm" />
          </div>
          <StickerBadge size={96} tilt={-8} style={{ position: "absolute", right: 14, bottom: 68 }} />
          <div style={{ position: "absolute", left: "var(--gutter-screen)", bottom: 16, right: 120 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Badge tone="chartreuse">Regular</Badge>
              <Badge tone="green">Open till 2</Badge>
            </div>
            <h1 style={{ font: "var(--weight-black) 32px/0.92 var(--font-display)", letterSpacing: "var(--tracking-display)", color: "var(--paper-050)" }}>Bar Basso</h1>
            <p style={{ font: "var(--type-body-sm)", color: "var(--paper-200)", marginTop: 4 }}>Porta Venezia · Milan · 0.9 mi</p>
          </div>
        </div>

        <div style={{ padding: "16px var(--gutter-screen)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <RatingPips value={4.6} size={20} showValue />
            <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>212 reviews from the club</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <StatCard value="4.6" label="Avg tini" />
            <StatCard value="14" label="On the menu" />
            <StatCard value="38" label="Regulars" />
          </div>
          <Button tone="primary" size="lg" icon="martini" block onClick={onCompose}>Rate a tini here</Button>

          <Tabs items={["Menu", "Reviews", "Info"]} value={tab} onChange={setTab} style={{ alignSelf: "flex-start" }} />

          {tab === "Menu" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {D.martinis.slice(0, 4).map(m => <MartiniCard key={m.id} {...m} bar="Bar Basso" image="../../assets/photo-martini-lamp.jpg" />)}
            </div>
          ) : tab === "Reviews" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 10 }}>
              {D.feed.slice(0, 2).map(r => <ReviewCard key={r.id} {...r} bar="Bar Basso · Milan" image={undefined} />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10, font: "var(--type-body)" }}>
              <p><strong>Via Plinio 39, Milan</strong></p>
              <p style={{ color: "var(--text-muted)" }}>Open 18:00 – 02:00 · Tue closed</p>
              <p style={{ color: "var(--text-muted)" }}>Dim, tiled, loud in the good way. Ask for the coupe.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { BarScreen });
