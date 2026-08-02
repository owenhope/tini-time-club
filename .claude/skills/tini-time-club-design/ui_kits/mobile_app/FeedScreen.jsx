const { AppBar, Tabs, ReviewCard, SectionHeader, Avatar, Chip, Toast } = window.TiniTimeClubDesignSystem_1636c5;

function FeedScreen({ onOpenBar, onCompose }) {
  const D = window.TTC_DATA;
  const [tab, setTab] = React.useState("Following");
  const [liked, setLiked] = React.useState({});
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 34 }}><AppBar showLogo assetBase="../../assets/" actions={[{ icon: "bell", label: "Alerts" }, { icon: "search", label: "Search" }]} /></div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px var(--gutter-screen) 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "var(--green-900)", borderRadius: "var(--radius-xl)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--chartreuse-500)" }}>Friday</span>
          <span style={{ font: "var(--weight-black) 30px/0.9 var(--font-display)", letterSpacing: "var(--tracking-display)", color: "var(--paper-050)", textTransform: "lowercase" }}>
            it's tini time 🍸
          </span>
          <span style={{ font: "var(--type-body-sm)", color: "var(--green-300)" }}>Friday night and the shaker's calling.</span>
        </div>

        <Tabs items={["Following", "Nearby", "Trending"]} value={tab} onChange={setTab} style={{ alignSelf: "flex-start" }} />

        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 2 }}>
          {["Milo Grant", "Ines Vo", "Theo Marsh", "Priya Raman", "Sam Okoro"].map((n, i) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: "0 0 auto", width: 62 }}>
              <Avatar name={n} size={54} ring={i < 2} />
              <span style={{ font: "var(--type-caption)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 62 }}>{n.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        <SectionHeader eyebrow="The club" title={tab === "Following" ? "From your people" : tab === "Nearby" ? "Poured near you" : "Trending tonight"} />
        {D.feed.map(r => (
          <ReviewCard key={r.id} {...r} liked={!!liked[r.id]} onLike={() => setLiked(s => ({ ...s, [r.id]: !s[r.id] }))} />
        ))}
      </div>
    </div>
  );
}
Object.assign(window, { FeedScreen });
