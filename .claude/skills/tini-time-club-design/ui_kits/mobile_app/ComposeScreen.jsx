const { AppBar, Input, RatingPips, Chip, Button, Select, Icon, Switch } = window.TiniTimeClubDesignSystem_1636c5;

function ComposeScreen({ onBack, onPost }) {
  const [rating, setRating] = React.useState(0);
  const [tags, setTags] = React.useState(["Extra dirty"]);
  const toggle = t => setTags(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 34 }}>
        <AppBar leadingIcon="x" title="Rate your tini" onLeading={onBack} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px var(--gutter-screen) 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ background: "var(--purple-500)", borderRadius: "var(--radius-xl)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--green-700)" }}>Your verdict</span>
          <RatingPips value={rating} size={34} onRate={setRating} />
          <span style={{ font: "var(--type-body-sm)", color: "var(--green-700)" }}>
            {rating === 0 ? "Taste. Presentation. Judgment." : rating >= 4 ? "Now that's a pour." : "Honest is fine too."}
          </span>
        </div>

        <Input label="Bar" icon="map-pin" value="Bar Basso" />
        <Input label="What did you order?" placeholder="Extra dirty, three olives" />
        <Select label="Base spirit" options={["Gin", "Vodka", "Dealer's choice"]} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>Flavour profile</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Extra dirty", "Bone dry", "Ice cold", "Brine-forward", "Botanical", "Twist"].map(t => (
              <Chip key={t} selected={tags.includes(t)} onClick={() => toggle(t)}>{t}</Chip>
            ))}
          </div>
        </div>

        <Input label="Tasting notes" multiline rows={4} placeholder="Cold enough to hurt. Say why." />

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" style={{
            flex: 1, height: 92, borderRadius: "var(--radius-md)", border: "2px dashed var(--green-300)",
            background: "var(--surface-card-sunk)", color: "var(--green-700)", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            font: "var(--weight-bold) 13px/1 var(--font-body)",
          }}>
            <Icon name="camera" size={22} />Add a photo
          </button>
          <div style={{ flex: 1, height: 92, borderRadius: "var(--radius-md)", backgroundImage: "url(../../assets/photo-martini-lamp.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} />
        </div>

        <Switch label="Share to the club feed" checked />
      </div>
      <div style={{ padding: "12px var(--gutter-screen) 20px", borderTop: "1px solid var(--line-hairline)", background: "var(--surface-card)" }}>
        <Button tone="primary" size="lg" block onClick={onPost} disabled={rating === 0}>Publish your verdict</Button>
      </div>
    </div>
  );
}
Object.assign(window, { ComposeScreen });
