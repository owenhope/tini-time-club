const { BentoGrid, BentoTile, Icon, Button, TiltPillStack } = window.TiniTimeClubDesignSystem_1636c5;

function Pillars() {
  const items = [
    { icon: "search", title: "Discover, review, share", body: "Trending martinis, classic recipes and local favourites — reviewed by people who actually drank them." },
    { icon: "map-pin", title: "Find the best near you", body: "Lounges, cocktail bars and hidden gems. Search by flavour profile, ingredient or bar name." },
    { icon: "users", title: "Connect with the club", body: "Follow friends and mixologists, comment, and find new favourites in the community feed." },
    { icon: "book-open", title: "Your martini journal", body: "Every tini you've tried, with ratings and notes — ready for the next night out." },
  ];
  return (
    <section style={{ background: "var(--surface-brand)" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "80px var(--gutter-page)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 34, maxWidth: "26ch" }}>
          <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--green-700)" }}>What you get</span>
          <h2 style={{ font: "var(--type-display-2)", letterSpacing: "var(--tracking-display)", color: "var(--green-700)", textTransform: "lowercase" }}>
            shaken, stirred, or both
          </h2>
        </div>

        <BentoGrid columns={3} gap={16}>
          <BentoTile tone="green" span={2} padding={28}>
            <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", opacity: .8 }}>Verdicts poured</span>
            <span style={{ font: "var(--weight-black) 72px/0.9 var(--font-display)", letterSpacing: "var(--tracking-display)", color: "var(--chartreuse-500)" }}>99.9k</span>
            <span style={{ font: "var(--type-body)", color: "var(--green-300)", marginTop: 6 }}>The club runs on reviews. Do your part, agent 🍸</span>
          </BentoTile>
          <BentoTile tone="photo" rowSpan={2} image="../../assets/photo-martini-lamp.jpg" />
          <BentoTile tone="greenDeep" padding={26} style={{ gap: 12, alignItems: "flex-start" }}>
            <TiltPillStack items={["Dirty", "Dry", "Gibson"]} size={22} gap={10} />
          </BentoTile>
          <BentoTile tone="chartreuse" padding={26}>
            <span style={{ font: "var(--type-h2)", letterSpacing: "var(--tracking-heading)" }}>Make it dirty</span>
            <span style={{ font: "var(--type-body-sm)", marginTop: 6 }}>Rate taste, presentation and judgment — five olives, no stars.</span>
          </BentoTile>
        </BentoGrid>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 16 }}>
          {items.map(i => (
            <div key={i.title} style={{ background: "var(--paper-050)", borderRadius: "var(--radius-xl)", padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ width: 46, height: 46, borderRadius: "var(--radius-pill)", background: "var(--green-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={i.icon} size={22} color="var(--green-700)" />
              </span>
              <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)" }}>{i.title}</h3>
              <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", textWrap: "pretty" }}>{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { Pillars });
