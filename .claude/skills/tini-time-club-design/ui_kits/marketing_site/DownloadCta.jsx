const { Button, AppIcon, Logo, Icon } = window.TiniTimeClubDesignSystem_1636c5;

function DownloadCta() {
  return (
    <section style={{ background: "var(--surface-ink)" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "76px var(--gutter-page)", display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start" }}>
          <h2 style={{ font: "var(--type-display-2)", letterSpacing: "var(--tracking-display)", color: "var(--chartreuse-500)", textTransform: "lowercase", margin: 0 }}>
            it's tini time 🍸
          </h2>
          <p style={{ font: "var(--type-body-lg)", color: "var(--green-300)", maxWidth: "44ch" }}>
            Somewhere a bartender is polishing a coupe just for you. Get the app and go find it.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Button tone="onInk" size="lg" icon="apple">App Store</Button>
            <Button tone="onInk" size="lg" icon="play">Google Play</Button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <AppIcon colorway="purple" size={92} radius="22px" assetBase="../../assets/" />
          <AppIcon colorway="chartreuse" size={92} radius="22px" assetBase="../../assets/" />
          <AppIcon colorway="green" size={92} radius="22px" assetBase="../../assets/" />
        </div>
      </div>
      <footer style={{ borderTop: "1px solid var(--line-on-ink)" }}>
        <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "26px var(--gutter-page)", display: "flex", alignItems: "center", gap: 26 }}>
          <Logo tone="chartreuse" width={90} assetBase="../../assets/" />
          <nav style={{ display: "flex", gap: 22, flex: 1 }}>
            {["Discover", "Bars", "The club", "Press", "Privacy"].map(l => (
              <a key={l} href="#" style={{ font: "var(--type-body-sm)", color: "var(--green-300)", textDecoration: "none" }}>{l}</a>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 14, color: "var(--green-300)" }}>
            <Icon name="instagram" size={20} /><Icon name="youtube" size={20} /><Icon name="mail" size={20} />
          </div>
        </div>
        <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "0 var(--gutter-page) 26px", font: "var(--type-caption)", color: "var(--green-500)" }}>
          Please drink responsibly. 21+ only where applicable.
        </div>
      </footer>
    </section>
  );
}
Object.assign(window, { DownloadCta });
