/* eslint-disable */
// Home — hero banner with image + announcements + quick calendar + stats

function HomeScreen({ go }) {
  const state = useStore();
  const me = store.me();
  const isAdmin = me?.role === "admin";
  const isEditor = me?.role === "editor" || isAdmin;

  const [showCompose, setShowCompose] = React.useState(false);

  // listen for the topbar "ลงประกาศ" button
  React.useEffect(() => {
    const open = () => isEditor && setShowCompose(true);
    window.addEventListener("wt:compose", open);
    return () => window.removeEventListener("wt:compose", open);
  }, [isEditor]);

  const openDay = (dateKey) => {
    window.__openDay = dateKey;
    go("calendar");
  };

  const pinned = state.announcements.filter(a => a.pinned);
  const rest = state.announcements.filter(a => !a.pinned);

  // stats
  const allNotes = Object.values(state.notes).flat();
  const total = allNotes.length;
  const done = allNotes.filter(n => n.done).length;
  const pct = total ? Math.round(done/total*100) : 0;
  const today = new Date();
  const todayKey = fmt.dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const todayNotes = state.notes[todayKey] || [];

  return (
    <div className="page">
      {/* HERO */}
      <div className="hero-banner">
        <div className="img" style={{ backgroundImage: `url(${state.heroImage})` }}></div>
        <div className="content">
          <div>
            <span className="eyebrow"><Icon name="dot" size={6} /> 4KING SOCUTE · INTERNAL</span>
            <h1>ยินดีต้อนรับ, {me?.name?.split(" ")[0] || "ทีม"}</h1>
            <p className="tagline">
              ดูประกาศล่าสุด ตามงานของทีมแต่ละวัน และอัปเดตสถานะของคุณได้จากที่เดียว
            </p>
          </div>
          <div className="footrow">
            <button className="btn primary" onClick={() => go("calendar")}>
              <Icon name="cal" /> ไปที่ปฏิทินเดือนนี้
            </button>
            <div style={{ width: 16 }}></div>
            <div className="stat"><Icon name="check" size={14}/> <strong>{done}/{total}</strong> งานเสร็จเดือนนี้</div>
            <div className="stat"><Icon name="clock" size={14}/> <strong>{todayNotes.length}</strong> งานวันนี้</div>
            <div className="stat"><Icon name="user" size={14}/> <strong>{state.users.length}</strong> สมาชิก</div>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="home-grid">
        {/* LEFT — Announcements */}
        <div>
          <div className="row between" style={{ marginBottom: 14 }}>
            <h2 className="h-section">
              <Icon name="bell" size={16} />
              ประกาศ &amp; อัปเดต
              <span className="count">{state.announcements.length}</span>
            </h2>
            {isEditor && (
              <button className="btn primary sm" onClick={() => setShowCompose(true)}>
                <Icon name="plus" size={14} /> ลงประกาศใหม่
              </button>
            )}
          </div>

          {pinned.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="nav-section" style={{ padding: "0 4px 6px" }}>
                <Icon name="pin" size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                ปักหมุด
              </div>
              <div className="announce-list">
                {pinned.map(a => <AnnounceCard key={a.id} a={a} state={state} canEdit={isEditor} />)}
              </div>
            </div>
          )}

          <div className="nav-section" style={{ padding: "0 4px 6px" }}>ล่าสุด</div>
          <div className="announce-list">
            {rest.map(a => <AnnounceCard key={a.id} a={a} state={state} canEdit={isEditor} />)}
            {rest.length === 0 && <div className="empty">ยังไม่มีประกาศอื่น</div>}
          </div>

          {/* Calendar updates feed */}
          <CalendarFeed state={state} openDay={openDay}/>
        </div>

        {/* RIGHT — side panel */}
        <div className="side-panel">
          <MiniCalendar go={go} />
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">เสร็จแล้ว</div>
              <div className="value">{pct}<span style={{ fontSize: 14, color: "var(--muted)" }}>%</span></div>
              <div className="delta">{done} / {total} งาน</div>
            </div>
            <div className="stat-card">
              <div className="label">ค้าง</div>
              <div className="value">{total - done}</div>
              <div className="delta bad">ใน {Object.keys(state.notes).length} วัน</div>
            </div>
          </div>

          <div className="card">
            <h3 className="h-section" style={{ marginBottom: 8 }}>
              <Icon name="clock" size={14}/>
              กิจกรรมล่าสุด
            </h3>
            <div>
              {state.activity.slice(0, 5).map(l => {
                const u = store.user(l.who);
                const clickable = !!l.link?.dateKey;
                return (
                  <div key={l.id}
                       onClick={clickable ? () => openDay(l.link.dateKey) : undefined}
                       style={{ display: "flex", gap: 10, padding: "8px 0", fontSize: 12, cursor: clickable ? "pointer" : "default", borderRadius: 6 }}>
                    <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{fmt.initials(u?.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "var(--text)" }}><strong style={{ fontWeight: 600 }}>{u?.name?.split(" ")[0] || "⏺"}</strong> <span style={{ color: "var(--text-2)" }}>{l.action}</span></div>
                      <div style={{ color: "var(--muted)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.target}</div>
                    </div>
                    {clickable && <Icon name="chevR" size={12} style={{ color: "var(--muted-2)", alignSelf: "center" }}/>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showCompose && <ComposeAnnouncement onClose={() => setShowCompose(false)} />}
    </div>
  );
}

function AnnounceCard({ a, state, canEdit }) {
  const u = store.user(a.author);
  const date = new Date(a.date);
  const cat = state.categories.find(c => c.id === a.tag);
  const color = cat?.color || "#fb6fb0";
  return (
    <div className={"announce " + (a.pinned ? "pinned" : "")}>
      <div className="date">
        <div className="d">{date.getDate()}</div>
        <div className="m">{fmt.thMonthsShort[date.getMonth()]}</div>
      </div>
      <div className="body">
        <div className="meta-row">
          <span className="badge" style={{ color, background: color + "22", borderColor: color + "55" }}>
            <span className="dot" style={{ background: color }}></span>{cat?.name || a.tag || "ทั่วไป"}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>โดย {u?.name || "—"}</span>
          {a.pinned && <span className="badge pink"><Icon name="pin" size={10}/> ปักหมุด</span>}
        </div>
        <h3>{a.title}</h3>
        <p>{a.body}</p>
      </div>
      {canEdit && (
        <div className="actions">
          <button className="icon-btn" onClick={() => store.togglePinned(a.id)} title={a.pinned ? "ยกเลิกปักหมุด" : "ปักหมุด"}>
            <Icon name="pin" size={14} className={a.pinned ? "pin-icon" : ""} style={{ color: a.pinned ? "var(--pink)" : undefined }}/>
          </button>
          <button className="icon-btn" onClick={() => { if(confirm("ลบประกาศนี้?")) store.removeAnnouncement(a.id); }} title="ลบ">
            <Icon name="trash" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function ComposeAnnouncement({ onClose }) {
  const state = useStore();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [tag, setTag] = React.useState(state.categories[0]?.id || "");
  const [pinned, setPinned] = React.useState(false);
  const submit = () => {
    if (!title.trim()) return;
    store.addAnnouncement({ title, body, tag, pinned });
    onClose();
  };
  const selectedCat = state.categories.find(c => c.id === tag);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>ลงประกาศใหม่</h2>
            <div className="day-meta">ทุกคนในทีมจะเห็นประกาศนี้บนหน้าแรก</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>หัวข้อ</label>
            <input className="input" placeholder="เช่น Town Hall 21 พ.ค." value={title} onChange={e => setTitle(e.target.value)} autoFocus/>
          </div>
          <div className="field">
            <label>รายละเอียด</label>
            <textarea className="textarea" placeholder="เขียนข้อความประกาศ…" value={body} onChange={e => setBody(e.target.value)}/>
          </div>
          <div className="field">
            <label>หมวดหมู่</label>
            <div className="cat-chips" style={{ marginTop: 4 }}>
              {state.categories.map(c => (
                <button key={c.id} type="button"
                  className={"cat-chip " + (tag === c.id ? "active" : "")}
                  onClick={() => setTag(c.id)}>
                  <span className="dot" style={{ background: c.color }}></span>{c.name}
                </button>
              ))}
            </div>
            {selectedCat && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                จะเห็น badge สี <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: selectedCat.color, verticalAlign: "middle", margin: "0 4px" }}></span> {selectedCat.name} บนประกาศ
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <div className={"toggle " + (pinned ? "on" : "")} onClick={() => setPinned(!pinned)}></div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>ปักหมุดที่ด้านบน</div>
          </div>
        </div>
        <div className="modal-foot">
          <div style={{ fontSize: 11, color: "var(--muted)" }}>ประกาศจะถูก sync ขึ้น GitHub อัตโนมัติ</div>
          <div className="row">
            <button className="btn ghost" onClick={onClose}>ยกเลิก</button>
            <button className="btn primary" onClick={submit} disabled={!title.trim() || !tag}><Icon name="check" size={14}/> เผยแพร่</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarFeed({ state, openDay }) {
  // Pull only calendar-related activity entries (have a dateKey link)
  const updates = state.activity.filter(l => l.link?.dateKey).slice(0, 6);
  if (updates.length === 0) return null;

  const kindMeta = {
    add:    { icon: "plus",   color: "var(--indigo-2)", label: "เพิ่มงาน" },
    done:   { icon: "check",  color: "var(--green)",    label: "ปิดงาน" },
    undone: { icon: "refresh",color: "var(--amber)",    label: "เปิดงาน" },
    edit:   { icon: "edit",   color: "var(--violet)",   label: "แก้ไข" },
    image:  { icon: "img",    color: "var(--pink)",     label: "อัปโหลด" },
    remove: { icon: "trash",  color: "var(--rose)",     label: "ลบงาน" },
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 className="h-section">
          <Icon name="cal" size={16}/>
          อัปเดตจากปฏิทิน
          <span className="count">{updates.length}</span>
        </h2>
      </div>
      <div className="feed-list">
        {updates.map(l => {
          const u = store.user(l.who);
          const meta = kindMeta[l.link.kind] || kindMeta.edit;
          const { y, m, d } = fmt.parseKey(l.link.dateKey);
          return (
            <div key={l.id} className="feed-item" onClick={() => openDay(l.link.dateKey)}>
              <div className="feed-icon" style={{ color: meta.color, background: meta.color + "22", borderColor: meta.color + "55" }}>
                <Icon name={meta.icon} size={14}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="feed-title">
                  <strong>{u?.name?.split(" ")[0] || "—"}</strong>
                  <span style={{ color: "var(--text-2)" }}> {l.action}</span>
                  <span className="feed-target">{l.target}</span>
                </div>
                <div className="feed-meta">
                  <span className="badge" style={{ color: meta.color, background: meta.color + "18", borderColor: meta.color + "44" }}>
                    <Icon name="cal" size={10}/> {fmt.shortThai(d, m)} {y + 543}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>{l.at.slice(-5)}</span>
                </div>
              </div>
              <Icon name="chevR" size={14} style={{ color: "var(--muted-2)", alignSelf: "center", flexShrink: 0 }}/>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, textAlign: "center" }}>
        <a className="link" onClick={() => openDay(fmt.dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))}>
          ดูทั้งหมดในปฏิทิน →
        </a>
      </div>
    </div>
  );
}

function MiniCalendar({ go }) {
  const state = useStore();
  const [view, setView] = React.useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const today = new Date();
  const isThisMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const first = new Date(view.y, view.m, 1).getDay();
  const last = new Date(view.y, view.m+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push({ off: true });
  for (let d = 1; d <= last; d++) {
    const k = fmt.dateKey(view.y, view.m, d);
    cells.push({ d, hasNotes: !!state.notes[k], isToday: isThisMonth && d === today.getDate() });
  }
  while (cells.length % 7) cells.push({ off: true });

  return (
    <div className="quick-cal">
      <div className="head">
        <div className="title">{fmt.thMonthYear(view.y, view.m)}</div>
        <div className="row" style={{ gap: 2 }}>
          <button className="icon-btn" onClick={() => setView(v => v.m === 0 ? { y: v.y-1, m: 11 } : { ...v, m: v.m-1 })}><Icon name="chevL" size={14}/></button>
          <button className="icon-btn" onClick={() => go("calendar")}><Icon name="eye" size={14}/></button>
          <button className="icon-btn" onClick={() => setView(v => v.m === 11 ? { y: v.y+1, m: 0 } : { ...v, m: v.m+1 })}><Icon name="chevR" size={14}/></button>
        </div>
      </div>
      <div className="grid7">
        {fmt.dowShort.map(d => <div key={d} className="dow">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={"cell" + (c.off ? " off" : "") + (c.isToday ? " today" : "") + (c.hasNotes ? " has-notes" : "")} onClick={() => !c.off && go("calendar")}>
            {c.d || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;
