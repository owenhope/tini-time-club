const { TabBar, Toast } = window.TiniTimeClubDesignSystem_1636c5;

function App() {
  const [tab, setTab] = React.useState("feed");
  const [screen, setScreen] = React.useState(null); // "bar" | "compose"
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const openBar = () => setScreen("bar");
  const compose = () => setScreen("compose");
  const back = () => setScreen(null);
  const post = () => { setScreen(null); setTab("journal"); setToast("Logged. That's 129 tinis 🍸"); };

  let body;
  if (screen === "bar") body = <BarScreen onBack={back} onCompose={compose} />;
  else if (screen === "compose") body = <ComposeScreen onBack={back} onPost={post} />;
  else if (tab === "feed") body = <FeedScreen onOpenBar={openBar} onCompose={compose} />;
  else if (tab === "discover") body = <DiscoverScreen onOpenBar={openBar} />;
  else if (tab === "journal" || tab === "me") body = <ProfileScreen />;
  else body = <FeedScreen onOpenBar={openBar} onCompose={compose} />;

  const chromeless = screen === "compose";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", overflow: "hidden" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{body}</div>
      {toast ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 92, display: "flex", justifyContent: "center", zIndex: 55 }}>
          <Toast message={toast} />
        </div>
      ) : null}
      {chromeless ? null : (
        <TabBar
          value={screen ? "" : tab}
          onChange={id => { setScreen(id === "post" ? "compose" : null); if (id !== "post") setTab(id); }}
          items={[
            { id: "feed", label: "Feed", icon: "newspaper" },
            { id: "discover", label: "Discover", icon: "map-pin" },
            { id: "post", label: "Rate", icon: "plus-circle" },
            { id: "journal", label: "Journal", icon: "book-open", dot: true },
            { id: "me", label: "Me", icon: "user" },
          ]}
        />
      )}
    </div>
  );
}
Object.assign(window, { App });
