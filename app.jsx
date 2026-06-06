/* eslint-disable */
// Main app shell — sidebar nav, topbar, routing, tweaks

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "comfortable",
  "accentHue": 350
}/*EDITMODE-END*/;

function App() {
  const state = useStore();
  const me = store.me();
  const [route, setRoute] = React.useState(() => location.hash.replace("#", "") || "home");
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);

  // Apply theme + accent on mount and tweak changes
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.style.setProperty("--indigo",   `oklch(0.65 0.18 ${tweaks.accentHue})`);
    document.documentElement.style.setProperty("--indigo-2", `oklch(0.74 0.16 ${tweaks.accentHue})`);
  }, [tweaks.theme, tweaks.accentHue]);

  React.useEffect(() => {
    const onHash = () => setRoute(location.hash.replace("#","") || "home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (r) => { location.hash = r; setRoute(r); };

  if (!me) {
    return (
      <>
        <LoginScreen />
        <TweaksPanel>
          <TweakSection label="ธีม">
            <TweakRadio label="โหมด" value={tweaks.theme} onChange={v => setTweak("theme", v)} options={["dark","light"]}/>
            <TweakSlider label="สีหลัก (Hue)" value={tweaks.accentHue} onChange={v => setTweak("accentHue", v)} min={0} max={360} step={5} unit="°"/>
          </TweakSection>
        </TweaksPanel>
      </>
    );
  }

  const navItems = [
    { id: "home",     label: "หน้าแรก",   icon: "home" },
    { id: "calendar", label: "ปฏิทิน",    icon: "cal" },
    { id: "profile",  label: "โปรไฟล์",   icon: "user" },
  ];
  if (me.role === "admin") navItems.push({ id: "admin", label: "Admin", icon: "shield" });

  const crumbs = {
    home: ["หน้าแรก", "Announcements & Hero"],
    calendar: ["ปฏิทิน", fmt.thMonthYear(new Date().getFullYear(), new Date().getMonth())],
    admin: ["Admin Panel", "จัดการระบบ"],
    profile: ["โปรไฟล์", me.email],
  }[route] || ["", ""];

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="logo"><img src="assets/logo.png" alt="4KING SOCUTE"/></div>
            <div>
              <div className="name">4KING SOCUTE</div>
              <div className="sub">CALENDAR </div>
            </div>
          </div>

          <div className="nav-section">หลัก</div>
          {navItems.map(n => (
            <a key={n.id} className={"nav-item " + (route === n.id ? "active" : "")} href={"#" + n.id} onClick={(e) => { e.preventDefault(); go(n.id); }}>
              <Icon name={n.icon} size={16}/>
              {n.label}
              {n.id === "calendar" && Object.keys(state.notes).length > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 10, background: "var(--surface-3)", padding: "2px 7px", borderRadius: 999, color: "var(--muted)" }}>
                  {Object.values(state.notes).flat().filter(n => !n.done).length}
                </span>
              )}
            </a>
          ))}

          <div className="nav-section">หมวดหมู่</div>
          {state.categories.slice(0, 6).map(c => {
            const count = Object.values(state.notes).flat().filter(n => n.cat === c.id).length;
            return (
              <div key={c.id} className="nav-item" style={{ cursor: "default" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }}></span>
                <span style={{ fontSize: 13 }}>{c.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{count}</span>
              </div>
            );
          })}

          <div className="sidebar-foot">
            <div className="row" style={{ marginBottom: 8 }}>
              <SyncStatus state={state}/>
            </div>
            <div className="user-chip" onClick={() => go("profile")}>
              <div className="avatar" style={me.avatar ? { backgroundImage: `url(${me.avatar})`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}>
                {!me.avatar && fmt.initials(me.name)}
              </div>
              <div className="meta" style={{ flex: 1, minWidth: 0 }}>
                <div className="name">{me.name}</div>
                <div className="role">{me.role}</div>
              </div>
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); store.logout(); }} title="ออกจากระบบ">
                <Icon name="logout" size={14}/>
              </button>
            </div>
          </div>
        </aside>

        <main className="main" data-screen-label={crumbs[0]}>
          <div className="topbar">
            <div className="crumbs">
              <strong>{crumbs[0]}</strong>
              <span>·</span>
              <span>{crumbs[1]}</span>
            </div>
            <div className="topbar-actions">
              <button className="btn sm" onClick={() => go("calendar")}>
                <Icon name="cal" size={14}/> ปฏิทินวันนี้
              </button>
              {(me.role === "admin" || me.role === "editor") && (
                <button className="btn primary sm" onClick={() => {
                  window.dispatchEvent(new CustomEvent("wt:compose"));
                }}>
                  <Icon name="plus" size={14}/> ลงประกาศ
                </button>
              )}
            </div>
          </div>

          {route === "home" && <HomeScreen go={go}/>}
          {route === "calendar" && <CalendarScreen/>}
          {route === "admin" && <AdminScreen/>}
          {route === "profile" && <ProfileScreen/>}
        </main>
      </div>

      <TweaksPanel>
        <TweakSection label="ธีม">
          <TweakRadio label="โหมด" value={tweaks.theme} onChange={v => setTweak("theme", v)} options={["dark","light"]}/>
          <TweakSlider label="สีหลัก (Hue)" value={tweaks.accentHue} onChange={v => setTweak("accentHue", v)} min={0} max={360} step={5} unit="°"/>
        </TweakSection>
        <TweakSection label="ข้อมูล">
          <TweakButton label="Reset seed data" onClick={() => { if (confirm("ล้างข้อมูลทดลองและ seed ใหม่?")) store.reset(); }}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function SyncStatus({ state }) {
  const enabled = store.isCloudEnabled();
  const s = state.sync.status;
  const onClick = async () => {
    if (!enabled) return;
    const ok = await store.pullFromCloud();
    if (ok) {
      // visual feedback
    }
  };
  if (!enabled) {
    return (
      <span className="sync-bar" title="Cloud sync ยังไม่ได้ตั้งค่า — ดูคำแนะนำใน store.jsx" style={{ cursor: "default" }}>
        <span className="dot" style={{ background: "var(--muted-2)", boxShadow: "none", animation: "none" }}></span>
        local only
      </span>
    );
  }
  return (
    <span className={"sync-bar " + (s !== "synced" ? "syncing" : "")} onClick={onClick} title="คลิกเพื่อดึงข้อมูลล่าสุด" style={{ cursor: "pointer" }}>
      <span className="dot"></span>
      ☁️ {s === "synced" ? "cloud sync" : "syncing…"}
    </span>
  );
}

window.App = App;
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
