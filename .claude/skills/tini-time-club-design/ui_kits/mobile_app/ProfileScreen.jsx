const { AppBar, Avatar, Badge, StatCard, Tabs, ListRow, RatingPips, BarCard, EmptyState, Button, TiltPillStack } = window.TiniTimeClubDesignSystem_1636c5;

function ProfileScreen() {
  const D = window.TTC_DATA;
  const [tab, setTab] = React.useState("Journal");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ background: "var(--green-900)", padding: "56px var(--gutter-screen) 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar name={D.me.name} size={72} ring />
            <div style={{ flex: 1 }}>
              <h2 style={{ font: "var(--weight-black) 26px/0.95 var(--font-display)", letterSpacing: "var(--tracking-display)", color: "var(--paper-050)" }}>{D.me.name}</h2>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Badge tone="chartreuse">{D.me.rank}</Badge>
                <Badge tone="green">Regular ×7</Badge>
              </div>
            </div>
          </div>
          <p style={{ font: "var(--type-body-sm)", color: "var(--green-300)" }}>Chin up, pinky out. Milan → DC → wherever the coupe is cold.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <StatCard tone="ink" value={D.me.tinis} label="Tinis logged" />
            <StatCard tone="ink" value={D.me.bars} label="Regular at" />
            <StatCard tone="ink" value={D.me.followers} label="Followers" />
          </div>
        </div>

        <div style={{ padding: "16px var(--gutter-screen) 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Tabs items={["Journal", "Bars", "Shelf"]} value={tab} onChange={setTab} style={{ alignSelf: "flex-start" }} />
          {tab === "Journal" ? (
            <div>
              {D.journal.map(j => (
                <ListRow key={j.id} title={j.drink} subtitle={`${j.bar} · ${j.when}`} trailing={<RatingPips value={j.rating} />} chevron />
              ))}
            </div>
          ) : tab === "Bars" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {D.bars.filter(b => b.regular || b.rating > 4.3).map(b => <BarCard key={b.id} {...b} />)}
            </div>
          ) : (
            <div style={{ background: "var(--green-900)", borderRadius: "var(--radius-xl)", padding: 20 }}>
              <TiltPillStack items={["Dirty", "Dry", "Gibson"]} size={26} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { ProfileScreen });
