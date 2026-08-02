const { AppBar, SearchField, Chip, BarCard, MartiniCard, SectionHeader, BottomSheet, Button, Checkbox } = window.TiniTimeClubDesignSystem_1636c5;

function DiscoverScreen({ onOpenBar }) {
  const D = window.TTC_DATA;
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("Open now");
  const [sheet, setSheet] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div style={{ paddingTop: 34, background: "var(--surface-ink)" }}>
        <AppBar title="Discover" tone="ink" actions={[{ icon: "sliders-horizontal", label: "Filters", onClick: () => setSheet(true) }]} />
        <div style={{ padding: "0 var(--gutter-screen) 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <SearchField tone="onInk" value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ("")} />
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {["Open now", "Extra dirty", "Gin", "Vodka", "Twist", "< 1 mi"].map(f => (
              <Chip key={f} tone="onInk" selected={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 168, position: "relative", background: "var(--green-100)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(0deg,rgba(51,102,84,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(51,102,84,.10) 1px,transparent 1px)", backgroundSize: "26px 26px" }} />
          {[[74, 52], [188, 96], [286, 42], [130, 118]].map(([l, t], i) => (
            <span key={i} style={{
              position: "absolute", left: l, top: t, width: i === 0 ? 34 : 26, height: i === 0 ? 34 : 26,
              borderRadius: "50%", background: i === 0 ? "var(--chartreuse-500)" : "var(--green-700)",
              border: "3px solid var(--paper-050)", boxShadow: "var(--shadow-sm)",
            }} />
          ))}
          <div style={{ position: "absolute", bottom: 10, left: "var(--gutter-screen)", right: "var(--gutter-screen)" }}>
            <Button size="sm" tone="highlight" icon="crosshair">24 bars near you</Button>
          </div>
        </div>

        <div style={{ padding: "16px var(--gutter-screen) 26px", display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader eyebrow="Near you" title="Open right now" action="See all" />
          {D.bars.map(b => <BarCard key={b.id} {...b} onClick={onOpenBar} />)}
          <SectionHeader eyebrow="Trending tonight" title="What the club is drinking" style={{ marginTop: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {D.martinis.map(m => <MartiniCard key={m.id} {...m} image="../../assets/photo-martini-lamp.jpg" onClick={onOpenBar} />)}
          </div>
        </div>
      </div>

      <BottomSheet open={sheet} title="Filter tinis" onClose={() => setSheet(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Extra dirty", "Dry", "Gin", "Vodka", "Espresso", "Gibson"].map(t => <Chip key={t}>{t}</Chip>)}
          </div>
          <Checkbox label="Open now" checked />
          <Checkbox label="Bars I'm a Regular at" />
          <Button block onClick={() => setSheet(false)}>Show 24 bars</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
Object.assign(window, { DiscoverScreen });
