/* eslint-disable */
// Admin panel — tabs: announcements, users, categories, hero, activity

function AdminScreen() {
  const state = useStore();
  const me = store.me();
  const [tab, setTab] = React.useState("announcements");

  if (me?.role !== "admin") {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: 40 }}>
          <Icon name="shield" size={36} style={{ color: "var(--rose)", marginBottom: 12 }}/>
          <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>ไม่มีสิทธิ์เข้าถึง</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>หน้านี้สำหรับผู้ใช้ที่มียศ Admin เท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="h-page">Admin Panel</h1>
      <p className="h-sub">จัดการเนื้อหา ผู้ใช้งาน และตั้งค่าระบบทั้งหมด</p>

      <div className="tab-row">
        {[
          { id: "announcements", label: "ประกาศ", icon: "bell" },
          { id: "pending",       label: "คำขอเข้าใช้งาน", icon: "shield", badge: state.pending?.length },
          { id: "users",         label: "ผู้ใช้งาน", icon: "user" },
          { id: "categories",    label: "หมวดหมู่", icon: "filter" },
          { id: "tasks",         label: "งานตามหมวดหมู่", icon: "check" },
          { id: "owners",        label: "งานตามผู้รับผิดชอบ", icon: "user" },
          { id: "hero",          label: "Hero Image", icon: "img" },
          { id: "activity",      label: "Activity Log", icon: "clock" },
        ].map(t => (
          <button key={t.id} className={"tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={13} style={{ verticalAlign: "middle", marginRight: 6 }}/>
            {t.label}
            {t.badge > 0 && <span style={{ marginLeft: 6, background: "var(--rose)", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "announcements" && <AnnouncementsAdmin state={state}/>}
      {tab === "pending" && <PendingAdmin state={state}/>}
      {tab === "users" && <UsersAdmin state={state}/>}
      {tab === "categories" && <CategoriesAdmin state={state}/>}
      {tab === "tasks" && <TasksByCategoryAdmin state={state}/>}
      {tab === "owners" && <TasksByOwnerAdmin state={state}/>}
      {tab === "hero" && <HeroAdmin state={state}/>}
      {tab === "activity" && <ActivityAdmin state={state}/>}
    </div>
  );
}

// ---------- Announcements ----------
function AnnouncementsAdmin({ state }) {
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 className="h-section">ประกาศทั้งหมด <span className="count">{state.announcements.length}</span></h2>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 30 }}></th>
            <th>หัวข้อ</th>
            <th style={{ width: 100 }}>หมวด</th>
            <th style={{ width: 140 }}>ผู้ลง</th>
            <th style={{ width: 110 }}>วันที่</th>
            <th style={{ width: 90 }}></th>
          </tr>
        </thead>
        <tbody>
          {state.announcements.map(a => {
            const u = store.user(a.author);
            return (
              <tr key={a.id}>
                <td>
                  <button className="icon-btn" onClick={() => store.togglePinned(a.id)}>
                    <Icon name="pin" size={14} style={{ color: a.pinned ? "var(--pink)" : "var(--muted-2)" }}/>
                  </button>
                </td>
                <td style={{ color: "var(--text)", fontWeight: 500 }}>{a.title}</td>
                <td>
                  {(() => {
                    const cat = state.categories.find(c => c.id === a.tag);
                    const color = cat?.color || "#fb6fb0";
                    return (
                      <span className="badge" style={{ color, background: color + "22", borderColor: color + "55" }}>
                        <span className="dot" style={{ background: color }}></span>{cat?.name || a.tag || "—"}
                      </span>
                    );
                  })()}
                </td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <div className="avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{fmt.initials(u?.name)}</div>
                    <span style={{ fontSize: 12 }}>{u?.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{a.date}</td>
                <td>
                  <div className="row">
                    <button className="icon-btn"><Icon name="edit" size={13}/></button>
                    <button className="icon-btn" onClick={() => { if (confirm("ลบประกาศ?")) store.removeAnnouncement(a.id); }}><Icon name="trash" size={13}/></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Pending Requests ----------
function PendingAdmin({ state }) {
  const pending = state.pending || [];
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 className="h-section">
          <Icon name="shield" size={14}/>
          คำขอเข้าใช้งานจากผู้ใช้ใหม่
          <span className="count">{pending.length}</span>
        </h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>อีเมลจะใช้งานได้หลังจากอนุมัติ</span>
      </div>
      {pending.length === 0 && <div className="empty">ยังไม่มีคำขอรอดำเนินการ</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pending.map(p => <PendingRow key={p.id} req={p}/>)}
      </div>
    </div>
  );
}

function PendingRow({ req }) {
  const [role, setRole] = React.useState("member");
  const [showPin, setShowPin] = React.useState(false);
  return (
    <div className="pending-row">
      <div className="avatar" style={{ width: 38, height: 38, fontSize: 13 }}>{fmt.initials(req.name)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{req.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--mono)" }}>{req.email}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          ยื่นคำขอ {req.requestedAt} · PIN 
          <span style={{ fontFamily: "var(--mono)", marginLeft: 4, padding: "1px 6px", borderRadius: 4, background: "var(--surface-3)", cursor: "pointer" }}
                onClick={() => setShowPin(s => !s)}>
            {showPin ? req.pin : "••••"}
          </span>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <select className="select" style={{ padding: "6px 10px", fontSize: 12, width: 130 }} value={role} onChange={e => setRole(e.target.value)}>
          <option value="member">Member</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn sm" onClick={() => { if (confirm("ปฏิเสธคำขอของ " + req.email + "?")) store.rejectPending(req.id); }}>
          <Icon name="x" size={12}/> ปฏิเสธ
        </button>
        <button className="btn primary sm" onClick={() => store.approvePending(req.id, role)}>
          <Icon name="check" size={12}/> อนุมัติ
        </button>
      </div>
    </div>
  );
}

// ---------- Users ----------
function UsersAdmin({ state }) {
  const [showAdd, setShowAdd] = React.useState(false);
  return (
    <>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h2 className="h-section">ผู้ใช้งาน <span className="count">{state.users.length}</span></h2>
        <button className="btn primary sm" onClick={() => setShowAdd(true)}><Icon name="plus" size={14}/> เพิ่มผู้ใช้</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th style={{ width: 140 }}>ยศ</th>
              <th style={{ width: 120 }}>เข้าร่วม</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {state.users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="name-cell">
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{fmt.initials(u.name)}</div>
                    {u.name}
                  </div>
                </td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{u.email}</td>
                <td>
                  <select className="select" style={{ padding: "5px 8px", fontSize: 12, width: 110 }} value={u.role} onChange={e => store.setUserRole(u.id, e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="member">Member</option>
                  </select>
                </td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{u.joined}</td>
                <td>
                  {u.id !== store.me()?.id && (
                    <button className="icon-btn" onClick={() => { if (confirm("ลบผู้ใช้?")) store.removeUser(u.id); }}>
                      <Icon name="trash" size={13}/>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)}/>}
    </>
  );
}

function AddUserModal({ onClose }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [role, setRole] = React.useState("member");
  const submit = () => {
    if (!name || !email || pin.length !== 4) return;
    store.addUser({ name, email, pin, role });
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div><h2>เพิ่มผู้ใช้ใหม่</h2><div className="day-meta">ผู้ใช้จะสามารถเข้าระบบได้ทันทีด้วยอีเมล + PIN</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="modal-body">
          <div className="field"><label>ชื่อ-นามสกุล</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus/></div>
          <div className="field"><label>อีเมล</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}/></div>
          <div className="field"><label>PIN 4 หลัก</label>
            <input className="input" type="tel" inputMode="numeric" maxLength={4} placeholder="••••" value={pin}
                   onChange={e => setPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                   style={{ letterSpacing: 8, fontFamily: "var(--mono)", fontSize: 18, textAlign: "center" }}/>
          </div>
          <div className="field"><label>ยศ</label>
            <select className="select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="admin">Admin — แก้ไขทั้งระบบ</option>
              <option value="editor">Editor — ลงประกาศ + แก้ไขเนื้อหา</option>
              <option value="member">Member — โน้ตและอ่านได้</option>
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <span></span>
          <div className="row">
            <button className="btn ghost" onClick={onClose}>ยกเลิก</button>
            <button className="btn primary" onClick={submit} disabled={!name || !email || pin.length !== 4}><Icon name="check" size={14}/> เพิ่ม</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Categories ----------
function CategoriesAdmin({ state }) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#fb6fb0");
  // Curated palette — multiple shades per hue family
  const palette = [
    // reds / pinks
    "#f87171", "#fb7185", "#ec4899", "#f9a8d4", "#e879f9",
    // oranges / ambers
    "#fb923c", "#f97316", "#fbbf24", "#f59e0b", "#facc15",
    // greens
    "#84cc16", "#34d399", "#10b981", "#22c55e", "#059669",
    // teals / cyans
    "#14b8a6", "#22d3ee", "#06b6d4", "#0ea5e9", "#38bdf8",
    // blues / indigos
    "#60a5fa", "#3b82f6", "#f0457e", "#4f46e5", "#f97fa8",
    // violets / purples
    "#fb6fb0", "#8b5cf6", "#7c3aed", "#c084fc", "#d946ef",
    // neutrals / earth
    "#a3a3a3", "#737373", "#a8a29e", "#92400e", "#1f2937",
  ];
  const submit = () => { if (!name.trim()) return; store.addCategory({ name, color }); setName(""); };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 22 }}>
      <div className="card">
        <h2 className="h-section">หมวดหมู่งาน <span className="count">{state.categories.length}</span></h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {state.categories.map(c => {
            const count = Object.values(state.notes).flat().filter(n => n.cat === c.id).length;
            return (
              <div key={c.id} className="cat-card">
                <div className="label">
                  <div className="dot" style={{ background: c.color }}></div>
                  {c.name}
                  <span className="badge" style={{ marginLeft: 6 }}>{count} งาน</span>
                </div>
                <button className="icon-btn" onClick={() => { if (confirm("ลบหมวดหมู่ '" + c.name + "'?")) store.removeCategory(c.id); }}>
                  <Icon name="trash" size={13}/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <h2 className="h-section">เพิ่มหมวดหมู่ใหม่</h2>
        <div className="field"><label>ชื่อ</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น Finance"/></div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>สี</label>
          <div className="palette-grid">
            {palette.map(p => (
              <button key={p} type="button" onClick={() => setColor(p)}
                title={p}
                className={"swatch " + (color === p ? "active" : "")}
                style={{ background: p }}/>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10, alignItems: "center" }}>
            <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{ width: 28, height: 28, border: "2px solid var(--border-2)", borderRadius: 8, padding: 0, cursor: "pointer", background: "transparent" }}/>
              เลือกสีเอง
            </label>
            <div style={{ flex: 1 }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 11 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: color }}></div>
              {color.toUpperCase()}
            </div>
          </div>
        </div>
        <button className="btn primary" style={{ marginTop: 18, width: "100%", justifyContent: "center" }} onClick={submit} disabled={!name.trim()}>
          <Icon name="plus" size={14}/> เพิ่มหมวดหมู่
        </button>
      </div>
    </div>
  );
}

// ---------- Tasks by Category ----------
function TasksByCategoryAdmin({ state }) {
  const [filter, setFilter] = React.useState("all"); // all | done | open
  const [openCat, setOpenCat] = React.useState(null);

  // Collect all notes from all dates with their date
  const allTasks = React.useMemo(() => {
    const tasks = [];
    Object.entries(state.notes || {}).forEach(([dateKey, list]) => {
      list.forEach(n => tasks.push({ ...n, dateKey, source: "calendar" }));
    });
    // Also include side-panel tasks scheduled to dates — they're owned by owners not categories,
    // so skip them here. Just calendar notes.
    return tasks;
  }, [state.notes]);

  // Group by category
  const grouped = React.useMemo(() => {
    const map = {};
    (state.categories || []).forEach(c => { map[c.id] = []; });
    map._uncategorized = [];
    allTasks.forEach(t => {
      if (map[t.cat]) map[t.cat].push(t);
      else map._uncategorized.push(t);
    });
    return map;
  }, [allTasks, state.categories]);

  const totalAll = allTasks.length;
  const totalDone = allTasks.filter(t => t.done).length;

  return (
    <div>
      {/* Overall summary */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="h-section" style={{ margin: 0 }}>ภาพรวมงานในปฏิทิน</h2>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              ทั้งหมด <strong style={{ color: "var(--text)" }}>{totalAll}</strong> งาน · <strong style={{ color: "var(--green)" }}>{totalDone} เสร็จ</strong> · {totalAll - totalDone} ค้าง
            </div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className={"chip-toggle " + (filter === "all" ? "active" : "")} onClick={() => setFilter("all")}>ทั้งหมด ({totalAll})</button>
            <button className={"chip-toggle " + (filter === "open" ? "active" : "")} onClick={() => setFilter("open")}>ค้าง ({totalAll - totalDone})</button>
            <button className={"chip-toggle " + (filter === "done" ? "active" : "")} onClick={() => setFilter("done")}>เสร็จแล้ว ({totalDone})</button>
          </div>
        </div>

        {totalAll > 0 && (
          <div className="overall-bar">
            <div className="overall-fill" style={{ width: `${(totalDone/totalAll)*100}%` }}></div>
            <span className="overall-label">{Math.round((totalDone/totalAll)*100)}%</span>
          </div>
        )}
      </div>

      {/* Per-category cards */}
      <div className="cat-stats-grid">
        {(state.categories || []).map(c => {
          const tasks = grouped[c.id] || [];
          const done = tasks.filter(t => t.done).length;
          const pct = tasks.length ? Math.round(done/tasks.length*100) : 0;
          const filtered = filter === "all" ? tasks : filter === "done" ? tasks.filter(t => t.done) : tasks.filter(t => !t.done);
          const isOpen = openCat === c.id;
          return (
            <div key={c.id} className="cat-stat-card" style={{ borderLeftColor: c.color }}>
              <div className="cat-stat-head" onClick={() => setOpenCat(isOpen ? null : c.id)}>
                <div className="row" style={{ gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
                  <span className="cat-color-blob" style={{ background: c.color }}></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="cat-name">{c.name}</div>
                    <div className="cat-sub">{tasks.length} งาน · {done} เสร็จ · {tasks.length - done} ค้าง</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  <div className="cat-pct" style={{ color: c.color }}>{pct}<span style={{ fontSize: 10, color: "var(--muted)" }}>%</span></div>
                  <Icon name={isOpen ? "chevR" : "chevR"} size={14} style={{ color: "var(--muted-2)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 180ms" }}/>
                </div>
              </div>

              <div className="cat-progress-bar">
                <div className="fill" style={{ width: `${pct}%`, background: c.color }}></div>
              </div>

              {isOpen && (
                <div className="cat-task-list">
                  {filtered.length === 0 && (
                    <div className="empty" style={{ padding: 14, fontSize: 12 }}>
                      {filter === "all" ? "ยังไม่มีงานในหมวดนี้" : filter === "done" ? "ไม่มีงานที่เสร็จในหมวดนี้" : "ไม่มีงานค้างในหมวดนี้"}
                    </div>
                  )}
                  {filtered.map(t => {
                    const { d, m, y } = fmt.parseKey(t.dateKey);
                    const author = store.user(t.author);
                    return (
                      <div key={t.id + t.dateKey} className={"cat-task-row " + (t.done ? "done" : "")}>
                        <div className={"checkbox " + (t.done ? "checked" : "")} onClick={() => store.updateNote(t.dateKey, t.id, { done: !t.done })}>
                          {t.done && <Icon name="check" size={11} stroke={3}/>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="cat-task-text">{t.text}</div>
                          <div className="cat-task-meta">
                            <span><Icon name="cal" size={10}/> {fmt.shortThai(d, m)} {y + 543}</span>
                            {t.at && <span><Icon name="clock" size={10}/> {t.at}</span>}
                            {author && <span className="author"><span className="avatar-xs">{fmt.initials(author.name)}</span>{author.name?.split(" ")[0]}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized */}
        {(grouped._uncategorized || []).length > 0 && (
          <div className="cat-stat-card" style={{ borderLeftColor: "var(--muted-2)" }}>
            <div className="cat-stat-head" onClick={() => setOpenCat(openCat === "_uncat" ? null : "_uncat")}>
              <div className="row" style={{ gap: 10, alignItems: "center", flex: 1 }}>
                <span className="cat-color-blob" style={{ background: "var(--muted-2)" }}></span>
                <div>
                  <div className="cat-name">ไม่มีหมวดหมู่</div>
                  <div className="cat-sub">{grouped._uncategorized.length} งาน · งานที่อาจอ้าง category ที่ถูกลบไปแล้ว</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(state.categories || []).length === 0 && (
          <div className="empty" style={{ padding: 40 }}>
            ยังไม่มีหมวดหมู่ — ไปที่แท็บ "หมวดหมู่" เพื่อสร้าง
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Tasks by Owner ----------
function TasksByOwnerAdmin({ state }) {
  const [filter, setFilter] = React.useState("all");
  const [openOwner, setOpenOwner] = React.useState(null);

  const allTasks = state.sideTasks || [];
  const owners = state.owners || [];

  // Group by owner — a task with multiple owners appears in each owner's group
  const grouped = React.useMemo(() => {
    const map = {};
    owners.forEach(o => { map[o.id] = []; });
    map._noowner = [];
    allTasks.forEach(t => {
      const ids = getTaskOwners(t);
      if (ids.length === 0) {
        map._noowner.push(t);
      } else {
        ids.forEach(id => {
          if (map[id]) map[id].push(t);
          else map._noowner.push(t);
        });
      }
    });
    return map;
  }, [allTasks, owners]);

  const totalAll = allTasks.length;
  const totalDone = allTasks.filter(t => t.done).length;
  const totalScheduled = allTasks.filter(t => t.scheduledOn).length;

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="h-section" style={{ margin: 0 }}>ภาพรวมงานตามผู้รับผิดชอบ</h2>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              งานในลิสต์รวม <strong style={{ color: "var(--text)" }}>{totalAll}</strong> · 
              <strong style={{ color: "var(--green)" }}> {totalDone} เสร็จ</strong> · 
              {totalAll - totalDone} ค้าง · 
              <strong style={{ color: "var(--indigo-2)" }}> {totalScheduled} กำหนดวันแล้ว</strong>
            </div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className={"chip-toggle " + (filter === "all" ? "active" : "")} onClick={() => setFilter("all")}>ทั้งหมด ({totalAll})</button>
            <button className={"chip-toggle " + (filter === "open" ? "active" : "")} onClick={() => setFilter("open")}>ค้าง ({totalAll - totalDone})</button>
            <button className={"chip-toggle " + (filter === "done" ? "active" : "")} onClick={() => setFilter("done")}>เสร็จแล้ว ({totalDone})</button>
            <button className={"chip-toggle " + (filter === "scheduled" ? "active" : "")} onClick={() => setFilter("scheduled")}>กำหนดวัน ({totalScheduled})</button>
          </div>
        </div>

        {totalAll > 0 && (
          <div className="overall-bar">
            <div className="overall-fill" style={{ width: `${(totalDone/totalAll)*100}%` }}></div>
            <span className="overall-label">{Math.round((totalDone/totalAll)*100)}%</span>
          </div>
        )}
      </div>

      <div className="cat-stats-grid">
        {owners.map(o => {
          const tasks = grouped[o.id] || [];
          const done = tasks.filter(t => t.done).length;
          const scheduled = tasks.filter(t => t.scheduledOn).length;
          const pct = tasks.length ? Math.round(done/tasks.length*100) : 0;
          const filtered = filter === "all" ? tasks
                         : filter === "done" ? tasks.filter(t => t.done)
                         : filter === "scheduled" ? tasks.filter(t => t.scheduledOn)
                         : tasks.filter(t => !t.done);
          const isOpen = openOwner === o.id;
          return (
            <div key={o.id} className="cat-stat-card" style={{ borderLeftColor: o.color }}>
              <div className="cat-stat-head" onClick={() => setOpenOwner(isOpen ? null : o.id)}>
                <div className="row" style={{ gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, background: `linear-gradient(135deg, ${o.color}, ${o.color}cc)` }}>
                    {fmt.initials(o.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="cat-name">{o.name}</div>
                    <div className="cat-sub">{tasks.length} งาน · {done} เสร็จ · {tasks.length - done} ค้าง · {scheduled} กำหนดวัน</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  <div className="cat-pct" style={{ color: o.color }}>{pct}<span style={{ fontSize: 10, color: "var(--muted)" }}>%</span></div>
                  <Icon name="chevR" size={14} style={{ color: "var(--muted-2)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 180ms" }}/>
                </div>
              </div>

              <div className="cat-progress-bar">
                <div className="fill" style={{ width: `${pct}%`, background: o.color }}></div>
              </div>

              {isOpen && (
                <div className="cat-task-list">
                  {filtered.length === 0 && (
                    <div className="empty" style={{ padding: 14, fontSize: 12 }}>
                      {filter === "all" ? "ยังไม่มีงาน" : filter === "done" ? "ไม่มีงานที่เสร็จ" : filter === "scheduled" ? "ไม่มีงานที่กำหนดวัน" : "ไม่มีงานค้าง"}
                    </div>
                  )}
                  {filtered.map(t => {
                    const author = store.user(t.author);
                    return (
                      <div key={t.id} className={"cat-task-row " + (t.done ? "done" : "")}>
                        <div className={"checkbox " + (t.done ? "checked" : "")} onClick={() => store.updateSideTask(t.id, { done: !t.done })}>
                          {t.done && <Icon name="check" size={11} stroke={3}/>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="cat-task-text">{t.title}</div>
                          {t.details && (
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                              {t.details.length > 120 ? t.details.slice(0, 120) + "…" : t.details}
                            </div>
                          )}
                          <div className="cat-task-meta">
                            {t.scheduledOn && (() => {
                              const { d, m, y } = fmt.parseKey(t.scheduledOn);
                              return <span className="badge indigo" style={{ fontSize: 10 }}><Icon name="cal" size={9}/> {fmt.shortThai(d, m)} {y + 543}</span>;
                            })()}
                            {!t.scheduledOn && <span style={{ fontSize: 10, color: "var(--muted)" }}>ยังไม่ได้กำหนดวัน</span>}
                            {author && <span className="author"><span className="avatar-xs">{fmt.initials(author.name)}</span>{author.name?.split(" ")[0]}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {(grouped._noowner || []).length > 0 && (
          <div className="cat-stat-card" style={{ borderLeftColor: "var(--muted-2)" }}>
            <div className="cat-stat-head" onClick={() => setOpenOwner(openOwner === "_noowner" ? null : "_noowner")}>
              <div className="row" style={{ gap: 10, alignItems: "center", flex: 1 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, background: "var(--surface-3)" }}>?</div>
                <div>
                  <div className="cat-name">ไม่มีผู้รับผิดชอบ</div>
                  <div className="cat-sub">{grouped._noowner.length} งาน · ผู้รับผิดชอบถูกลบหรือยังไม่กำหนด</div>
                </div>
              </div>
              <Icon name="chevR" size={14} style={{ color: "var(--muted-2)", transform: openOwner === "_noowner" ? "rotate(90deg)" : "none", transition: "transform 180ms" }}/>
            </div>
            {openOwner === "_noowner" && (
              <div className="cat-task-list">
                {grouped._noowner.map(t => (
                  <div key={t.id} className={"cat-task-row " + (t.done ? "done" : "")}>
                    <div className={"checkbox " + (t.done ? "checked" : "")} onClick={() => store.updateSideTask(t.id, { done: !t.done })}>
                      {t.done && <Icon name="check" size={11} stroke={3}/>}
                    </div>
                    <div className="cat-task-text">{t.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {owners.length === 0 && (
          <div className="empty" style={{ padding: 40 }}>
            ยังไม่มีผู้รับผิดชอบ — ไปเพิ่มใน <strong>ปฏิทิน → แผงด้านขวา → ลิสต์งาน</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Hero ----------
function HeroAdmin({ state }) {
  const [pending, setPending] = React.useState(null); // pending image (data URL or preset path)
  const [savedFlash, setSavedFlash] = React.useState(false);

  const current = state.heroImage;
  const preview = pending ?? current;
  const dirty = pending !== null && pending !== current;

  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPending(r.result);
    r.readAsDataURL(f);
    e.target.value = ""; // allow re-upload same file
  };

  const save = () => {
    if (!dirty) return;
    store.setHero(pending);
    setPending(null);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  };
  const cancel = () => setPending(null);

  const presets = state.heroPresets || [
    "assets/hero.png",
    "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1600&q=80",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80",
  ];

  const [showAddPreset, setShowAddPreset] = React.useState(false);
  const [presetUrl, setPresetUrl] = React.useState("");

  const addPresetFromUrl = () => {
    if (!presetUrl.trim()) return;
    store.addHeroPreset(presetUrl.trim());
    setPresetUrl("");
    setShowAddPreset(false);
  };
  const addPresetFromFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => store.addHeroPreset(r.result);
    r.readAsDataURL(f);
    e.target.value = "";
    setShowAddPreset(false);
  };

  return (
    <div>
      <h2 className="h-section">รูปภาพหน้า Hero</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -4, marginBottom: 16 }}>รูปนี้จะแสดงที่ด้านบนของหน้าแรกและหน้าล็อกอิน — ต้องกด <strong>บันทึก</strong> เพื่อให้มีผลบนเว็บ</p>

      <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
        {dirty && (
          <div className="hero-preview-tag">
            <Icon name="eye" size={11}/> Preview · ยังไม่ได้บันทึก
          </div>
        )}
        <div style={{ height: 240, backgroundImage: `url(${preview})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(24,10,18,0.7), rgba(24,10,18,0.2))" }}></div>
          <div style={{ position: "absolute", left: 24, bottom: 24, color: "#fff", fontWeight: 600, fontSize: 22 }}>4KING SOCUTE — ยินดีต้อนรับ</div>
        </div>
        <div style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>ขนาดที่แนะนำ 2000 × 800 px (.png / .jpg)</div>
          <div className="row" style={{ gap: 8 }}>
            <label className="btn">
              <Icon name="upload" size={14}/> เลือกรูปใหม่
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload}/>
            </label>
            {dirty && (
              <button className="btn ghost" onClick={cancel}>
                <Icon name="x" size={13}/> ยกเลิก
              </button>
            )}
            <button className="btn primary" onClick={save} disabled={!dirty}>
              <Icon name="check" size={14}/> บันทึก{dirty ? "การเปลี่ยนแปลง" : ""}
            </button>
          </div>
        </div>
        {savedFlash && (
          <div className="hero-saved-toast">
            <Icon name="check" size={13}/> บันทึกแล้ว · หน้าแรกและหน้าล็อกอินจะใช้รูปนี้
          </div>
        )}
      </div>

      <div className="row between" style={{ marginTop: 22, marginBottom: 12, alignItems: "center" }}>
        <h3 className="h-section" style={{ margin: 0 }}>หรือเลือกจาก preset <span className="count">{presets.length}</span></h3>
        <button className="btn primary sm" onClick={() => setShowAddPreset(s => !s)}>
          <Icon name="plus" size={12}/> เพิ่ม preset
        </button>
      </div>

      {showAddPreset && (
        <div className="card" style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 10 }}>เลือกวิธีเพิ่ม preset:</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="btn">
              <Icon name="upload" size={13}/> อัปโหลดไฟล์
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={addPresetFromFile}/>
            </label>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>หรือ</span>
            <input className="input" placeholder="วาง URL รูปภาพที่นี่…" value={presetUrl} onChange={e => setPresetUrl(e.target.value)} style={{ flex: 1, minWidth: 200 }}/>
            <button className="btn primary" onClick={addPresetFromUrl} disabled={!presetUrl.trim()}>
              <Icon name="plus" size={13}/> เพิ่ม
            </button>
            <button className="btn ghost" onClick={() => { setShowAddPreset(false); setPresetUrl(""); }}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {presets.map((p, i) => (
          <div key={i} className="preset-tile" onClick={() => setPending(p)}
            style={{
              height: 110, borderRadius: 10, cursor: "pointer",
              backgroundImage: `url(${p})`, backgroundSize: "cover", backgroundPosition: "center",
              border: preview === p ? "2px solid var(--indigo)" : "1px solid var(--border)",
              position: "relative", overflow: "hidden", transition: "all 120ms"
            }}>
            {preview === p && (
              <div style={{ position: "absolute", top: 8, right: 8, background: "var(--indigo)", borderRadius: "50%", width: 22, height: 22, display: "grid", placeItems: "center" }}>
                <Icon name="check" size={12} stroke={3} style={{ color: "#fff" }}/>
              </div>
            )}
            {current === p && pending === null && (
              <div style={{ position: "absolute", bottom: 8, left: 8, padding: "2px 8px", background: "rgba(24,10,18,0.7)", borderRadius: 999, fontSize: 10, color: "#fff", letterSpacing: 0.5 }}>
                ใช้งานอยู่
              </div>
            )}
            <button className="preset-del" title="ลบ preset"
              onClick={(e) => {
                e.stopPropagation();
                if (current === p) { alert("ไม่สามารถลบ preset ที่ใช้งานอยู่ — เปลี่ยน hero image ก่อน"); return; }
                if (confirm("ลบ preset นี้?")) store.removeHeroPreset(p);
              }}>
              <Icon name="trash" size={11}/>
            </button>
          </div>
        ))}
        {presets.length === 0 && (
          <div style={{ gridColumn: "1/-1", padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13, background: "var(--bg-2)", border: "1px dashed var(--border)", borderRadius: 10 }}>
            ยังไม่มี preset — กด "เพิ่ม preset" เพื่อเริ่ม
          </div>
        )}
      </div>

      {dirty && (
        <div className="hero-pending-bar">
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <span className="badge amber"><Icon name="dot" size={6}/> มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>กดปุ่ม "บันทึก" เพื่อยืนยัน</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost sm" onClick={cancel}>ยกเลิก</button>
            <button className="btn primary sm" onClick={save}><Icon name="check" size={12}/> บันทึก</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Activity ----------
function ActivityAdmin({ state }) {
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <h2 className="h-section">Activity Log <span className="count">{state.activity.length}</span></h2>
        <span className="badge"><Icon name="github" size={11}/> sync to git history</span>
      </div>
      <div>
        {state.activity.map(l => {
          const u = store.user(l.who);
          return (
            <div key={l.id} className="log-item">
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{fmt.initials(u?.name)}</div>
              <div>
                <div className="text"><strong>{u?.name || "—"}</strong> {l.action}: <span style={{ color: "var(--text)" }}>{l.target}</span></div>
              </div>
              <div className="when">{l.at}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.AdminScreen = AdminScreen;
