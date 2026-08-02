const { ReviewCard, SectionHeader, BarCard, Button } = window.TiniTimeClubDesignSystem_1636c5;

function CommunityProof() {
  const D = window.TTC_DATA;
  return (
    <section style={{ background: "var(--surface-page)" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "80px var(--gutter-page)", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 44 }}>
        <div>
          <SectionHeader eyebrow="The club" title="What people are drinking tonight" action="Open the feed" style={{ marginBottom: 20 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {D.feed.slice(0, 2).map(r => <ReviewCard key={r.id} {...r} />)}
          </div>
        </div>
        <div>
          <SectionHeader eyebrow="Near you" title="Open right now" style={{ marginBottom: 20 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {D.bars.map(b => <BarCard key={b.id} {...b} />)}
          </div>
          <Button tone="secondary" style={{ marginTop: 16 }} iconAfter="arrow-right">See all 24 bars</Button>
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { CommunityProof });
