/* eslint-disable */
// Calendar month view + Day detail modal

function CalendarScreen() {
  const state = useStore();
  const me = store.me();
  const isAdmin = me?.role === "admin";
  const today = new Date();
  const [dragOverKey, setDragOverKey] = React.useState(null);
  const [view, setView] = React.useState(() => {
    if (window.__openDay) {
      const { y, m } = fmt.parseKey(window.__openDay);
      return { y, m };
    }
    return { y: today.getFullYear(), m: today.getMonth() };
  });
  const [activeCats, setActiveCats] = React.useState(() => new Set(state.categories.map(c => c.id)));
  const [openKey, setOpenKey] = React.useState(() => {
    const k = window.__openDay;
    if (k) { delete window.__openDay; return k; }
    return null;
  });

  const toggleCat = (id) => {
    setActiveCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allActive = activeCats.size === state.categories.length;
  const toggleAll = () => setActiveCats(allActive ? new Set() : new Set(state.categories.map(c => c.id)));

  const prev = () => setView(v => v.m === 0 ? { y: v.y-1, m: 11 } : { ...v, m: v.m-1 });
  const next = () => setView(v => v.m === 11 ? { y: v.y+1, m: 0 } : { ...v, m: v.m+1 });
  const toToday = () => setView({ y: today.getFullYear(), m: today.getMonth() });

  // Tasks scheduled to each date (from side panel drag-drop)
  const tasksByDate = React.useMemo(() => {
    const map = {};
    (state.sideTasks || []).forEach(t => {
      if (t.scheduledOn) {
        if (!map[t.scheduledOn]) map[t.scheduledOn] = [];
        map[t.scheduledOn].push(t);
      }
    });
    return map;
  }, [state.sideTasks]);

  // Build grid (start Sunday)
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const lastDay = new Date(view.y, view.m+1, 0).getDate();
  const prevLast = new Date(view.y, view.m, 0).getDate();

  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ off: true, d: prevLast - i, y: view.m === 0 ? view.y-1 : view.y, m: view.m === 0 ? 11 : view.m - 1 });
  }
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ off: false, d, y: view.y, m: view.m });
  }
  // Trailing cells from NEXT month — count from 1 properly
  let trailingDay = 1;
  const trailingY = view.m === 11 ? view.y + 1 : view.y;
  const trailingM = view.m === 11 ? 0 : view.m + 1;
  while (cells.length % 7) {
    cells.push({ off: true, d: trailingDay, y: trailingY, m: trailingM });
    trailingDay++;
    if (cells.length > 42) break;
  }

  return (
    <div className="page">
      <div className="cal-toolbar">
        <div className="left">
          <button className="nav-btn" onClick={prev}><Icon name="chevL" size={14}/></button>
          <button className="nav-btn" onClick={next}><Icon name="chevR" size={14}/></button>
          <button className="btn sm" onClick={toToday}>วันนี้</button>
          <div className="month-title" style={{ marginLeft: 8 }}>{fmt.thMonthYear(view.y, view.m)}</div>
        </div>
        <div className="right">
          <div className="cat-chips">
            <button className={"cat-chip " + (allActive ? "active" : "")} onClick={toggleAll}>
              <Icon name="filter" size={11}/> ทั้งหมด
            </button>
            {state.categories.map(c => (
              <button key={c.id} className={"cat-chip " + (activeCats.has(c.id) ? "active" : "")} onClick={() => toggleCat(c.id)}>
                <span className="dot" style={{ background: c.color }}></span>{c.name}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button className="btn sm danger" onClick={() => {
              const total = Object.values(state.notes).flat().length;
              if (total === 0) { alert("ปฏิทินว่างอยู่แล้ว"); return; }
              if (confirm(`ล้างงานทั้งหมด ${total} รายการในปฏิทิน?\n\nการกระทำนี้ไม่สามารถกู้คืนได้`)) {
                store.clearAllNotes();
              }
            }}>
              <Icon name="trash" size={12}/> ล้างปฏิทิน
            </button>
          )}
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal-grid">
        {["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"].map(d => (
          <div key={d} className="dow-header">{d}</div>
        ))}
        {cells.map((c, i) => {
          const key = fmt.dateKey(c.y, c.m, c.d);
          const isToday = !c.off && c.y === today.getFullYear() && c.m === today.getMonth() && c.d === today.getDate();
          const allNotes = state.notes[key] || [];
          const notes = allNotes.filter(n => activeCats.has(n.cat));
          const scheduledTasks = tasksByDate[key] || [];
          const visible = notes.slice(0, 3 - Math.min(scheduledTasks.length, 2));
          const more = (notes.length - visible.length) + Math.max(0, scheduledTasks.length - 2);
          const images = allNotes.flatMap(n => n.images || []).filter(Boolean).slice(0, 4);
          const isDragOver = dragOverKey === key;
          return (
            <div key={i}
                 className={"cal-day" + (c.off ? " off" : "") + (isToday ? " today" : "") + (isDragOver ? " drag-over" : "")}
                 onClick={() => setOpenKey(key)}
                 onDragOver={(e) => { if (e.dataTransfer.types.includes("application/x-wt-task")) { e.preventDefault(); setDragOverKey(key); } }}
                 onDragLeave={() => setDragOverKey(d => d === key ? null : d)}
                 onDrop={(e) => {
                   e.preventDefault();
                   setDragOverKey(null);
                   const taskId = e.dataTransfer.getData("application/x-wt-task");
                   if (taskId) store.updateSideTask(taskId, { scheduledOn: key });
                 }}>
              <div className="day-head">
                <span className="day-num">{c.d}</span>
                {(notes.length + scheduledTasks.length) > 0 && (
                  <span className="day-count">
                    {notes.filter(n => n.done).length + scheduledTasks.filter(t => t.done).length}/{notes.length + scheduledTasks.length}
                  </span>
                )}
              </div>
              <div className="day-notes">
                {scheduledTasks.slice(0, 2).map(t => {
                  const ownerIds = getTaskOwners(t);
                  const o = (state.owners || []).find(x => x.id === ownerIds[0]);
                  return (
                    <div key={t.id} className={"cal-note task-pill" + (t.done ? " done" : "")} style={{ borderLeftColor: o?.color || "var(--violet)" }} title={t.title + (t.details ? "\n" + t.details : "")}>
                      <Icon name="check" size={9} stroke={2.5} style={{ color: o?.color || "var(--violet)" }}/>
                      <span className="cal-note-text">{t.title}</span>
                    </div>
                  );
                })}
                {visible.map(n => {
                  const cat = store.category(n.cat);
                  return (
                    <div key={n.id} className={"cal-note" + (n.done ? " done" : "")} style={{ borderLeftColor: cat?.color || "var(--violet)" }} title={n.text}>
                      <span className="cat-dot" style={{ background: cat?.color }}></span>
                      <span className="cal-note-text">{n.text}</span>
                    </div>
                  );
                })}
                {more > 0 && <div className="more">+{more} อื่นๆ</div>}
              </div>
              {images.length > 0 && (
                <div className="pic-strip">
                  {images.map((src, idx) => (
                    src !== "placeholder"
                      ? <img key={idx} src={src} alt="" onError={(e) => e.target.style.display='none'}/>
                      : <div key={idx} style={{ width: 18, height: 18, borderRadius: 3, background: "linear-gradient(135deg, var(--indigo), var(--pink))" }}></div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        </div>

        <SidePanel state={state}/>
      </div>

      {openKey && <DayDetail dateKey={openKey} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

// ---------- Side Panel: Quick Notes + Task List ----------
function SidePanel({ state }) {
  const me = store.me();
  const [tab, setTab] = React.useState("notes"); // notes | tasks
  const notes = state.sideNotes || [];
  const tasks = state.sideTasks || [];
  const openTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  return (
    <aside className="side-panel-cal">
      <div className="sp-head">
        <button className={"sp-tab " + (tab === "notes" ? "active" : "")} onClick={() => setTab("notes")}>
          <Icon name="edit" size={13}/> โน้ต
          {notes.length > 0 && <span className="sp-count">{notes.length}</span>}
        </button>
        <button className={"sp-tab " + (tab === "tasks" ? "active" : "")} onClick={() => setTab("tasks")}>
          <Icon name="check" size={13}/> ลิสต์งาน
          {openTasks.length > 0 && <span className="sp-count">{openTasks.length}</span>}
        </button>
      </div>

      {tab === "notes" && <SidePanelNotes notes={notes} me={me}/>}
      {tab === "tasks" && <SidePanelTasks tasks={tasks} openTasks={openTasks} doneTasks={doneTasks} state={state} me={me}/>}
    </aside>
  );
}

function SidePanelNotes({ notes, me }) {
  const [text, setText] = React.useState("");
  const submit = () => {
    if (!text.trim()) return;
    store.addSideNote(text.trim());
    setText("");
  };
  return (
    <div className="sp-body">
      <div className="sp-compose">
        <textarea
          className="textarea"
          placeholder="โน้ตด่วน… (Ctrl/⌘+Enter เพื่อบันทึก)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          style={{ minHeight: 70, fontSize: 13 }}
        />
        <button className="btn primary sm" onClick={submit} disabled={!text.trim()} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
          <Icon name="plus" size={12}/> เพิ่มโน้ต
        </button>
      </div>

      <div className="sp-list">
        {notes.length === 0 && (
          <div className="empty" style={{ padding: 24, fontSize: 12 }}>ยังไม่มีโน้ต<br/>เพิ่มข้างบนเพื่อเริ่ม</div>
        )}
        {notes.map(n => <StickyNote key={n.id} note={n}/>)}
      </div>
    </div>
  );
}

function StickyNote({ note: n }) {
  const state = useStore();
  const u = store.user(n.author);
  const replies = n.replies || [];
  const owners = state.owners || [];
  const isConfirmed = !!n.confirmedTaskId;
  const confirmedOwnerIds = Array.isArray(n.confirmedOwners) ? n.confirmedOwners : (n.confirmedOwner ? [n.confirmedOwner] : []);
  const confirmedOwners = confirmedOwnerIds.map(id => owners.find(o => o.id === id)).filter(Boolean);

  const [showReply, setShowReply] = React.useState(false);
  const [text, setText] = React.useState("");
  const [showOwnerPicker, setShowOwnerPicker] = React.useState(false);
  const [picked, setPicked] = React.useState([]);

  const togglePick = (id) => {
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const send = () => {
    if (!text.trim()) return;
    store.addSideNoteReply(n.id, text.trim());
    setText("");
  };

  const onToggle = () => {
    if (isConfirmed) {
      if (confirm("ยกเลิกการยืนยัน? งานในลิสต์งานจะถูกลบ")) store.unconfirmSideNote(n.id);
    } else {
      setShowOwnerPicker(true);
    }
  };

  const confirmIt = () => {
    store.confirmSideNoteAsTask(n.id, picked);
    setShowOwnerPicker(false);
    setPicked([]);
  };

  return (
    <div className={"sticky-note " + (isConfirmed ? "confirmed" : "")}>
      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <div className={"checkbox " + (isConfirmed ? "checked" : "")} onClick={onToggle} title={isConfirmed ? "ยกเลิกการยืนยัน" : "ยืนยันเป็นงานในลิสต์งาน"} style={{ marginTop: 2 }}>
          {isConfirmed && <Icon name="check" size={11} stroke={3}/>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sn-text">{n.text}</div>
          <div className="sn-meta">
            <span><span className="avatar-xs">{fmt.initials(u?.name)}</span>{u?.name?.split(" ")[0] || "?"}</span>
            {isConfirmed && confirmedOwners.length > 0 && confirmedOwners.map(co => (
              <span key={co.id} className="badge" style={{ color: co.color, background: co.color + "22", borderColor: co.color + "44" }}>
                <Icon name="check" size={9}/> {co.name}
              </span>
            ))}
            {isConfirmed && confirmedOwners.length === 0 && (
              <span className="badge"><Icon name="check" size={9}/> ในลิสต์งาน</span>
            )}
            <span style={{ flex: 1 }}></span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{n.at?.slice(-5)}</span>
            <button className="icon-btn" onClick={() => setShowReply(s => !s)} style={{ width: 22, height: 22 }} title="ตอบกลับ">
              💬{replies.length > 0 && <span style={{ fontSize: 9, marginLeft: 1 }}>{replies.length}</span>}
            </button>
            <button className="icon-btn" onClick={() => { if (confirm("ลบโน้ตนี้?")) store.removeSideNote(n.id); }} style={{ width: 22, height: 22 }}>
              <Icon name="trash" size={11}/>
            </button>
          </div>
        </div>
      </div>

      {/* Owner picker popup — appears when user ticks the checkbox */}
      {showOwnerPicker && (
        <div className="owner-picker-popup" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 8 }}>
            ✓ <strong style={{ color: "var(--text)" }}>ยืนยันงาน</strong> — เลือกผู้รับผิดชอบได้หลายคน:
          </div>
          {owners.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)", padding: 6, textAlign: "center" }}>
              ยังไม่มีผู้รับผิดชอบ — เพิ่มในแท็บ "ลิสต์งาน" ก่อน
            </div>
          )}
          <div className="row wrap" style={{ gap: 5 }}>
            {owners.map(o => {
              const isSel = picked.includes(o.id);
              return (
                <button key={o.id} type="button"
                  className={"owner-chip " + (isSel ? "active" : "")}
                  style={isSel ? { background: o.color, borderColor: o.color, color: "#fff" } : { borderColor: o.color + "55", color: o.color }}
                  onClick={() => togglePick(o.id)}>
                  {isSel && <Icon name="check" size={9} stroke={3}/>}
                  <span className="dot" style={{ background: isSel ? "#fff" : o.color }}></span>{o.name}
                </button>
              );
            })}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost sm" onClick={() => { setShowOwnerPicker(false); setPicked([]); }}>ยกเลิก</button>
            <button className="btn primary sm" onClick={confirmIt}>
              <Icon name="check" size={11}/> ยืนยัน{picked.length > 0 ? ` (${picked.length})` : ""}
            </button>
          </div>
        </div>
      )}

      {(replies.length > 0 || showReply) && (
        <div className="sn-replies">
          {replies.map(r => {
            const ru = store.user(r.author);
            return (
              <div key={r.id} className="sn-reply">
                <div className="sn-reply-head">
                  <span className="avatar-xs">{fmt.initials(ru?.name)}</span>
                  <strong>{ru?.name?.split(" ")[0] || "?"}</strong>
                  <span style={{ flex: 1 }}></span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>{r.at?.slice(-5)}</span>
                  <button className="icon-btn sn-reply-del" onClick={() => store.removeSideNoteReply(n.id, r.id)} title="ลบ">
                    <Icon name="x" size={9}/>
                  </button>
                </div>
                <div className="sn-reply-text">{r.text}</div>
              </div>
            );
          })}
          {showReply && (
            <div className="sn-reply-compose">
              <textarea className="textarea" placeholder="ตอบกลับ หรือเพิ่มรายละเอียด…&#10;Ctrl/⌘+Enter ส่ง"
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
                style={{ fontSize: 12, minHeight: 56 }} autoFocus/>
              <div className="row" style={{ gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
                <button className="btn ghost sm" onClick={() => { setShowReply(false); setText(""); }}>ยกเลิก</button>
                <button className="btn primary sm" onClick={send} disabled={!text.trim()}><Icon name="check" size={11}/> ส่ง</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidePanelTasks({ tasks, openTasks, doneTasks, state, me }) {
  const owners = state.owners || [];
  const [adding, setAdding] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [selectedOwners, setSelectedOwners] = React.useState([]);
  const [showOwnerForm, setShowOwnerForm] = React.useState(false);
  const [newOwnerName, setNewOwnerName] = React.useState("");
  const [newOwnerColor, setNewOwnerColor] = React.useState("#34d399");
  const [manageMode, setManageMode] = React.useState(false);
  const [editingOwner, setEditingOwner] = React.useState(null);

  const palette = [
    "#f87171", "#fb7185", "#ec4899", "#f9a8d4", "#e879f9",
    "#fb923c", "#f97316", "#fbbf24", "#f59e0b", "#facc15",
    "#84cc16", "#34d399", "#10b981", "#22c55e", "#059669",
    "#14b8a6", "#22d3ee", "#06b6d4", "#0ea5e9", "#38bdf8",
    "#60a5fa", "#3b82f6", "#f0457e", "#4f46e5", "#f97fa8",
    "#fb6fb0", "#8b5cf6", "#7c3aed", "#c084fc", "#d946ef",
    "#a3a3a3", "#737373", "#a8a29e", "#92400e", "#1f2937",
  ];

  React.useEffect(() => {
    if (selectedOwners.length === 0 && owners[0]) setSelectedOwners([owners[0].id]);
  }, [owners]); // eslint-disable-line

  const submit = () => {
    if (!title.trim()) return;
    store.addSideTask({ title: title.trim(), details: details.trim(), owners: selectedOwners });
    setTitle(""); setDetails(""); setAdding(false);
  };

  const toggleOwner = (id) => {
    setSelectedOwners(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addOwner = () => {
    if (!newOwnerName.trim()) return;
    store.addOwner({ name: newOwnerName.trim(), color: newOwnerColor });
    setNewOwnerName(""); setShowOwnerForm(false);
    setTimeout(() => {
      const fresh = store.get().owners || [];
      const last = fresh[fresh.length - 1];
      if (last) setSelectedOwners(prev => [...prev, last.id]);
    }, 50);
  };

  return (
    <div className="sp-body">
      {!adding ? (
        <button className="btn primary sm" onClick={() => setAdding(true)} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
          <Icon name="plus" size={12}/> เพิ่มงานใหม่
        </button>
      ) : (
        <div className="sp-compose task-compose">
          <input className="input" placeholder="ชื่องาน" value={title} onChange={e => setTitle(e.target.value)} autoFocus style={{ fontSize: 13 }}/>
          <textarea className="textarea" placeholder="รายละเอียด (ไม่บังคับ)" value={details} onChange={e => setDetails(e.target.value)} style={{ minHeight: 50, fontSize: 12, marginTop: 6 }}/>

          <div className="row between" style={{ alignItems: "center", margin: "0 0 4px" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
              ผู้รับผิดชอบ {selectedOwners.length > 0 && <span style={{ color: "var(--indigo-2)", marginLeft: 4 }}>({selectedOwners.length})</span>}
            </span>
            <button type="button" className={"manage-btn " + (manageMode ? "active" : "")} onClick={() => { setManageMode(m => !m); setEditingOwner(null); }}>
              <Icon name="edit" size={10}/> {manageMode ? "เสร็จ" : "จัดการ"}
            </button>
          </div>
          <div className="owner-chips">
            {owners.map(o => {
              const isSelected = selectedOwners.includes(o.id);
              return (
                <div key={o.id} className="owner-chip-wrap">
                  <button type="button"
                    className={"owner-chip " + (isSelected && !manageMode ? "active" : "")}
                    style={isSelected && !manageMode ? { background: o.color, borderColor: o.color, color: "#fff" } : { borderColor: o.color + "55", color: o.color }}
                    onClick={() => manageMode ? setEditingOwner(editingOwner === o.id ? null : o.id) : toggleOwner(o.id)}>
                    {isSelected && !manageMode && <Icon name="check" size={9} stroke={3}/>}
                    <span className="dot" style={{ background: isSelected && !manageMode ? "#fff" : o.color }}></span>{o.name}
                    {manageMode && <Icon name="edit" size={9} style={{ marginLeft: 2 }}/>}
                  </button>
                </div>
              );
            })}
            {!manageMode && (
              <button type="button" className="owner-chip add" onClick={() => setShowOwnerForm(s => !s)}>
                <Icon name="plus" size={10}/> เพิ่ม
              </button>
            )}
          </div>

          {/* Edit existing owner */}
          {manageMode && editingOwner && (() => {
            const o = owners.find(x => x.id === editingOwner);
            if (!o) return null;
            return <EditOwnerBox owner={o} palette={palette} onClose={() => setEditingOwner(null)}/>;
          })()}

          {showOwnerForm && (
            <div className="add-owner-box">
              <input className="input" placeholder="ชื่อผู้รับผิดชอบ" value={newOwnerName} onChange={e => setNewOwnerName(e.target.value)} style={{ fontSize: 12, padding: "6px 10px" }}/>
              <div className="palette-grid" style={{ marginTop: 8, gridTemplateColumns: "repeat(7, 1fr)" }}>
                {palette.map(p => (
                  <button key={p} type="button" onClick={() => setNewOwnerColor(p)}
                    title={p}
                    className={"swatch " + (newOwnerColor === p ? "active" : "")}
                    style={{ background: p }}/>
                ))}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "center" }}>
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-2)", cursor: "pointer" }}>
                  <input type="color" value={newOwnerColor} onChange={e => setNewOwnerColor(e.target.value)}
                    style={{ width: 22, height: 22, border: "1.5px solid var(--border-2)", borderRadius: 6, padding: 0, cursor: "pointer", background: "transparent" }}/>
                  เลือกสีเอง
                </label>
                <div style={{ flex: 1 }}></div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 7px", background: "var(--surface-2)", borderRadius: 5, fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: newOwnerColor }}></div>
                  {newOwnerColor.toUpperCase()}
                </div>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <button className="btn ghost sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setShowOwnerForm(false); setNewOwnerName(""); }}>ยกเลิก</button>
                <button className="btn primary sm" style={{ flex: 1, justifyContent: "center" }} onClick={addOwner} disabled={!newOwnerName.trim()}>เพิ่ม</button>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            <button className="btn ghost sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setAdding(false); setTitle(""); setDetails(""); }}>ยกเลิก</button>
            <button className="btn primary sm" style={{ flex: 1, justifyContent: "center" }} onClick={submit} disabled={!title.trim()}>บันทึก</button>
          </div>
        </div>
      )}

      <div className="sp-list">
        {tasks.length === 0 && (
          <div className="empty" style={{ padding: 24, fontSize: 12 }}>ยังไม่มีงาน<br/>เพิ่มงานแรกข้างบน</div>
        )}
        {openTasks.map(t => <TaskRow key={t.id} task={t} owners={owners}/>)}
        {doneTasks.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: "var(--muted)", margin: "10px 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>
              ✓ เสร็จแล้ว ({doneTasks.length})
            </div>
            {doneTasks.map(t => <TaskRow key={t.id} task={t} owners={owners}/>)}
          </>
        )}
      </div>
    </div>
  );
}

function EditOwnerBox({ owner, palette, onClose }) {
  const [name, setName] = React.useState(owner.name);
  const [color, setColor] = React.useState(owner.color);
  const save = () => {
    if (!name.trim()) return;
    store.updateOwner(owner.id, { name: name.trim(), color });
    onClose();
  };
  const del = () => {
    if (confirm(`ลบผู้รับผิดชอบ "${owner.name}"?\n\nงานที่ถูกกำหนดให้คนนี้จะไม่ถูกลบ แต่จะไม่มีผู้รับผิดชอบ`)) {
      store.removeOwner(owner.id);
      onClose();
    }
  };
  return (
    <div className="add-owner-box">
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, letterSpacing: 0.5 }}>
        ✏️ แก้ไข <strong style={{ color: "var(--text)" }}>{owner.name}</strong>
      </div>
      <input className="input" placeholder="ชื่อ" value={name} onChange={e => setName(e.target.value)} autoFocus style={{ fontSize: 12, padding: "6px 10px" }}/>
      <div className="palette-grid" style={{ marginTop: 8, gridTemplateColumns: "repeat(7, 1fr)" }}>
        {palette.map(p => (
          <button key={p} type="button" onClick={() => setColor(p)}
            title={p}
            className={"swatch " + (color === p ? "active" : "")}
            style={{ background: p }}/>
        ))}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "center" }}>
        <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-2)", cursor: "pointer" }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 22, height: 22, border: "1.5px solid var(--border-2)", borderRadius: 6, padding: 0, cursor: "pointer", background: "transparent" }}/>
          เลือกสีเอง
        </label>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 7px", background: "var(--surface-2)", borderRadius: 5, fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: color }}></div>
          {color.toUpperCase()}
        </div>
      </div>
      <div className="row" style={{ gap: 6, marginTop: 10 }}>
        <button className="btn danger sm" style={{ justifyContent: "center" }} onClick={del}><Icon name="trash" size={11}/> ลบ</button>
        <div style={{ flex: 1 }}></div>
        <button className="btn ghost sm" onClick={onClose}>ยกเลิก</button>
        <button className="btn primary sm" onClick={save} disabled={!name.trim()}><Icon name="check" size={11}/> บันทึก</button>
      </div>
    </div>
  );
}

function TaskRow({ task, owners }) {
  const [expanded, setExpanded] = React.useState(false);
  const [showReply, setShowReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const taskOwnerIds = getTaskOwners(task);
  const taskOwners = taskOwnerIds.map(id => owners.find(o => o.id === id)).filter(Boolean);
  const firstColor = taskOwners[0]?.color || "var(--violet)";
  const author = store.user(task.author);
  const replies = task.replies || [];
  const onDragStart = (e) => {
    e.dataTransfer.setData("application/x-wt-task", task.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const sendReply = () => {
    if (!replyText.trim()) return;
    store.addSideTaskReply(task.id, replyText.trim());
    setReplyText("");
  };
  return (
    <div className={"task-row " + (task.done ? "done" : "") + (task.scheduledOn ? " scheduled" : "")}
         draggable={!task.done}
         onDragStart={onDragStart}
         style={{ borderLeftColor: firstColor }}
         title={task.scheduledOn ? "" : "ลากไปที่วันในปฏิทินเพื่อกำหนดวัน"}>
      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <div className="task-grip" title="ลากไปวางในปฏิทิน">⋮⋮</div>
        <div className={"checkbox " + (task.done ? "checked" : "")} onClick={() => store.updateSideTask(task.id, { done: !task.done })} style={{ marginTop: 1 }}>
          {task.done && <Icon name="check" size={11} stroke={3}/>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="task-title" style={{ cursor: task.details ? "pointer" : "default" }} onClick={() => task.details && setExpanded(e => !e)}>{task.title}</div>
          <div className="task-meta">
            {taskOwners.map(o => (
              <span key={o.id} className="badge" style={{ color: o.color, background: o.color + "22", borderColor: o.color + "44" }}>
                <span className="dot" style={{ background: o.color }}></span>{o.name}
              </span>
            ))}
            {task.scheduledOn && (
              <span className="badge indigo" title="กำหนดวันแล้ว">
                <Icon name="cal" size={9}/> {(() => { const {d,m} = fmt.parseKey(task.scheduledOn); return fmt.shortThai(d, m); })()}
              </span>
            )}
            {author && <span className="avatar-xs" title={author.name}>{fmt.initials(author.name)}</span>}
            {task.details && <button className="note-action-btn" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => setExpanded(e => !e)}>{expanded ? "▾ ย่อ" : "▸ รายละเอียด"}</button>}
            <button className="note-action-btn" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => setShowReply(s => !s)}>
              💬 {replies.length > 0 && <span style={{ fontWeight: 600 }}>{replies.length}</span>}
            </button>
          </div>
          {expanded && task.details && (
            <div className="task-details">{task.details}</div>
          )}

          {(replies.length > 0 || showReply) && (
            <div className="sn-replies" style={{ marginTop: 8 }}>
              {replies.map(r => {
                const ru = store.user(r.author);
                return (
                  <div key={r.id} className="sn-reply">
                    <div className="sn-reply-head">
                      <span className="avatar-xs">{fmt.initials(ru?.name)}</span>
                      <strong>{ru?.name?.split(" ")[0] || "?"}</strong>
                      <span style={{ flex: 1 }}></span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{r.at?.slice(-5)}</span>
                      <button className="icon-btn sn-reply-del" onClick={() => store.removeSideTaskReply(task.id, r.id)} title="ลบ">
                        <Icon name="x" size={9}/>
                      </button>
                    </div>
                    <div className="sn-reply-text">{r.text}</div>
                  </div>
                );
              })}
              {showReply && (
                <div className="sn-reply-compose">
                  <textarea className="textarea" placeholder="ตอบกลับ หรือเพิ่มรายละเอียด…&#10;Ctrl/⌘+Enter ส่ง"
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
                    style={{ fontSize: 12, minHeight: 56 }} autoFocus/>
                  <div className="row" style={{ gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
                    <button className="btn ghost sm" onClick={() => { setShowReply(false); setReplyText(""); }}>ยกเลิก</button>
                    <button className="btn primary sm" onClick={sendReply} disabled={!replyText.trim()}><Icon name="check" size={11}/> ส่ง</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="row" style={{ gap: 0 }}>
          {task.scheduledOn && (
            <button className="icon-btn" onClick={() => store.updateSideTask(task.id, { scheduledOn: null })} title="ยกเลิกการกำหนดวัน" style={{ width: 22, height: 22, opacity: 0.6 }}>
              <Icon name="x" size={11}/>
            </button>
          )}
          <button className="icon-btn" onClick={() => { if (confirm("ลบงานนี้?")) store.removeSideTask(task.id); }} style={{ width: 22, height: 22, opacity: 0.5 }}>
            <Icon name="trash" size={11}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Day Detail ----------
function NoteItem({ note: n, dateKey, state, openLightbox, onUpload }) {
  const c = store.category(n.cat);
  const author = store.user(n.author);
  const replies = n.replies || [];
  const owners = state.owners || [];
  const isConfirmed = !!n.confirmedTaskId;
  const confirmedTask = isConfirmed ? (state.sideTasks || []).find(t => t.id === n.confirmedTaskId) : null;
  const confirmedOwnerIds = confirmedTask ? getTaskOwners(confirmedTask) : [];
  const confirmedOwners = confirmedOwnerIds.map(id => owners.find(o => o.id === id)).filter(Boolean);

  const [replyText, setReplyText] = React.useState("");
  const [showReplyBox, setShowReplyBox] = React.useState(false);
  const [showOwnerPicker, setShowOwnerPicker] = React.useState(false);
  const [picked, setPicked] = React.useState([]);

  const togglePick = (id) => {
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const sendReply = () => {
    if (!replyText.trim()) return;
    store.addNoteReply(dateKey, n.id, replyText.trim());
    setReplyText("");
  };

  const confirmAsTask = () => {
    store.confirmNoteAsTask(dateKey, n.id, picked);
    setShowOwnerPicker(false);
    setPicked([]);
  };

  return (
    <div className={"note-item " + (n.done ? "done" : "") + (isConfirmed ? " confirmed" : "")}>
      <div className={"checkbox " + (n.done ? "checked" : "")} onClick={() => store.updateNote(dateKey, n.id, { done: !n.done })}>
        {n.done && <Icon name="check" size={12} stroke={3}/>}
      </div>
      <div style={{ minWidth: 0 }}>
        <p className="note-text">{n.text}</p>
        <div className="note-meta">
          {c && <span className="badge" style={{ color: c.color, background: c.color + "22", borderColor: c.color + "55" }}>
            <span className="dot" style={{ background: c.color }}></span>{c.name}
          </span>}
          {isConfirmed && confirmedOwners.length > 0 && confirmedOwners.map(co => (
            <span key={co.id} className="badge" style={{ color: co.color, background: co.color + "22", borderColor: co.color + "44" }}>
              <Icon name="check" size={9}/> {co.name}
            </span>
          ))}
          {isConfirmed && confirmedOwners.length === 0 && <span className="badge green"><Icon name="check" size={9}/> ยืนยันแล้ว</span>}
          {n.at && <span><Icon name="clock" size={10}/> {n.at}</span>}
          <span className="author"><span className="avatar-xs">{fmt.initials(author?.name)}</span>{author?.name?.split(" ")[0] || "?"}</span>
        </div>

        {/* Images */}
        {(n.images && n.images.length > 0) && (
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {n.images.map((src, i) =>
              src === "placeholder"
                ? <div key={i} style={{ width: 50, height: 50, borderRadius: 6, background: "linear-gradient(135deg, var(--indigo), var(--pink))" }}/>
                : <img key={i} src={src} alt=""
                       className="thumb-clickable"
                       style={{ width: 50, height: 50, borderRadius: 6, objectFit: "cover", cursor: "zoom-in" }}
                       onClick={() => openLightbox(n.images, src)}/>
            )}
            <label className="image-tile upload" style={{ width: 50, height: 50, aspectRatio: "auto" }}>
              <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => onUpload(e, n.id)}/>
              <Icon name="plus" size={16}/>
            </label>
          </div>
        )}

        {/* Action row */}
        <div className="note-actions">
          {!isConfirmed ? (
            <button className="note-action-btn primary" onClick={() => setShowOwnerPicker(s => !s)} title="ยืนยันเป็นงานในลิสต์">
              <Icon name="check" size={11}/> Confirm งาน
            </button>
          ) : (
            <button className="note-action-btn green-active" onClick={() => { if (confirm("ยกเลิกการยืนยัน? งานในลิสต์จะถูกลบ")) store.unconfirmNote(dateKey, n.id); }} title="ยกเลิกการยืนยัน">
              <Icon name="check" size={11}/> ยืนยันแล้ว · ดูในลิสต์งาน
            </button>
          )}
          <button className="note-action-btn" onClick={() => setShowReplyBox(s => !s)}>
            💬 ตอบกลับ {replies.length > 0 && <span className="reply-count">{replies.length}</span>}
          </button>
        </div>

        {/* Owner picker */}
        {showOwnerPicker && (
          <div className="owner-picker-popup">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>เลือกผู้รับผิดชอบได้หลายคน (ติ๊กเพื่อเลือก/ติ๊กซ้ำเพื่อยกเลิก):</div>
            {owners.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: 8, textAlign: "center" }}>
                ยังไม่มีผู้รับผิดชอบ — เพิ่มในแผงด้านขวา → ลิสต์งาน → "+ เพิ่มงานใหม่"
              </div>
            )}
            <div className="row wrap" style={{ gap: 6 }}>
              {owners.map(o => {
                const isSel = picked.includes(o.id);
                return (
                  <button key={o.id} type="button"
                    className={"owner-chip " + (isSel ? "active" : "")}
                    style={isSel ? { background: o.color, borderColor: o.color, color: "#fff" } : { borderColor: o.color + "55", color: o.color }}
                    onClick={() => togglePick(o.id)}>
                    {isSel && <Icon name="check" size={9} stroke={3}/>}
                    <span className="dot" style={{ background: isSel ? "#fff" : o.color }}></span>{o.name}
                  </button>
                );
              })}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost sm" onClick={() => { setShowOwnerPicker(false); setPicked([]); }}>ยกเลิก</button>
              <button className="btn primary sm" onClick={confirmAsTask}>
                <Icon name="check" size={11}/> ยืนยัน{picked.length > 0 ? ` (${picked.length} คน)` : " (ไม่ระบุ)"}
              </button>
            </div>
          </div>
        )}

        {/* Replies */}
        {(replies.length > 0 || showReplyBox) && (
          <div className="replies-section">
            {replies.map(r => {
              const ru = store.user(r.author);
              return (
                <div key={r.id} className="reply-item">
                  <div className="avatar-xs">{fmt.initials(ru?.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="reply-head">
                      <strong>{ru?.name?.split(" ")[0] || "?"}</strong>
                      <span className="reply-time">{r.at?.slice(-5)}</span>
                    </div>
                    <div className="reply-text">{r.text}</div>
                  </div>
                  <button className="icon-btn reply-del" onClick={() => store.removeNoteReply(dateKey, n.id, r.id)} title="ลบ">
                    <Icon name="x" size={10}/>
                  </button>
                </div>
              );
            })}
            {showReplyBox && (
              <div className="reply-compose">
                <textarea className="textarea" placeholder="ตอบกลับ หรือเพิ่มรายละเอียด…&#10;(Enter ขึ้นบรรทัดใหม่ · Ctrl/⌘+Enter เพื่อส่ง)"
                       value={replyText}
                       onChange={e => setReplyText(e.target.value)}
                       onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
                       style={{ fontSize: 13, minHeight: 70, flex: 1 }} autoFocus/>
                <div className="row" style={{ flexDirection: "column", gap: 4 }}>
                  <button className="btn primary sm" onClick={sendReply} disabled={!replyText.trim()} title="Ctrl/⌘+Enter">
                    <Icon name="check" size={11}/> ส่ง
                  </button>
                  <button className="btn ghost sm" onClick={() => { setShowReplyBox(false); setReplyText(""); }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="row" style={{ gap: 2 }}>
        {(!n.images || n.images.length === 0) && (
          <label className="icon-btn" title="แนบรูป">
            <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => onUpload(e, n.id)}/>
            <Icon name="img" size={14}/>
          </label>
        )}
        <button className="icon-btn" title="ลบ" onClick={() => { if (confirm("ลบโน้ตนี้?")) store.removeNote(dateKey, n.id); }}>
          <Icon name="trash" size={14}/>
        </button>
      </div>
    </div>
  );
}

function ScheduledTaskItem({ task, state }) {
  const t = task;
  const ownerIds = getTaskOwners(t);
  const taskOwners = ownerIds.map(id => (state.owners || []).find(x => x.id === id)).filter(Boolean);
  const firstColor = taskOwners[0]?.color || "var(--violet)";
  const author = store.user(t.author);
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const detailsRef = React.useRef(null);

  // Measure: does the text actually overflow the collapsed box?
  React.useLayoutEffect(() => {
    if (!detailsRef.current || !t.details) return;
    const el = detailsRef.current;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [t.details]);

  const showCollapse = isOverflowing && !expanded;

  return (
    <div className={"note-item " + (t.done ? "done" : "")} style={{ borderLeft: `3px solid ${firstColor}` }}>
      <div className={"checkbox " + (t.done ? "checked" : "")} onClick={() => store.updateSideTask(t.id, { done: !t.done })}>
        {t.done && <Icon name="check" size={12} stroke={3}/>}
      </div>
      <div style={{ minWidth: 0 }}>
        <p className="note-text" style={{ fontWeight: 500 }}>{t.title}</p>
        <div className="note-meta">
          {taskOwners.map(o => (
            <span key={o.id} className="badge" style={{ color: o.color, background: o.color + "22", borderColor: o.color + "44" }}>
              <span className="dot" style={{ background: o.color }}></span>{o.name}
            </span>
          ))}
          <span className="badge indigo" style={{ fontSize: 10 }}>📋 จากลิสต์งาน</span>
          {author && (
            <span className="author">
              <span className="avatar-xs">{fmt.initials(author.name)}</span>
              {author.name?.split(" ")[0]}
            </span>
          )}
        </div>
        {t.details && (
          <div className={"task-details-box" + (expanded ? " expanded" : "")}>
            <div ref={detailsRef} className="task-details-text">{t.details}</div>
            {isOverflowing && !expanded && <div className="fade-bottom"></div>}
            {isOverflowing && (
              <button className="details-toggle" onClick={() => setExpanded(e => !e)}>
                {expanded ? "▲ ย่อรายละเอียด" : "▼ ดูเพิ่มเติม"}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="row" style={{ gap: 2 }}>
        <button className="icon-btn" title="ยกเลิกการกำหนดวัน" onClick={() => store.updateSideTask(t.id, { scheduledOn: null })}>
          <Icon name="x" size={13}/>
        </button>
      </div>
    </div>
  );
}

function DayDetail({ dateKey, onClose }) {
  const state = useStore();
  const me = store.me();
  const notes = state.notes[dateKey] || [];
  const scheduledTasks = (state.sideTasks || []).filter(t => t.scheduledOn === dateKey);
  const done = notes.filter(n => n.done).length;
  const allImages = notes.flatMap(n => (n.images || []).map(src => ({ src, noteId: n.id })));

  const [text, setText] = React.useState("");
  const [cat, setCat] = React.useState(state.categories[0]?.id);
  const fileRef = React.useRef();
  const [tab, setTab] = React.useState("notes"); // notes | images
  const [lightbox, setLightbox] = React.useState(null); // { images: [...], index: 0 }
  const [repeat, setRepeat] = React.useState("none"); // none | month | yearly

  const openLightbox = (allList, src) => {
    const list = allList.filter(s => s && s !== "placeholder");
    const idx = list.indexOf(src);
    if (idx < 0) return;
    setLightbox({ images: list, index: idx });
  };

  const submit = () => {
    if (!text.trim()) return;
    const { y, m, d } = fmt.parseKey(dateKey);

    if (repeat === "month") {
      // every day of dateKey's month
      const last = new Date(y, m+1, 0).getDate();
      for (let i = 1; i <= last; i++) {
        store.addNote(fmt.dateKey(y, m, i), { text, cat, author: me?.id });
      }
    } else if (repeat === "yearly") {
      // same day-of-month, every month starting this month for 12 months
      for (let i = 0; i < 12; i++) {
        const ny = y + Math.floor((m + i) / 12);
        const nm = (m + i) % 12;
        const lastDay = new Date(ny, nm+1, 0).getDate();
        if (d > lastDay) continue; // skip months that don't have this day (e.g. 31 in Feb)
        store.addNote(fmt.dateKey(ny, nm, d), { text, cat, author: me?.id });
      }
    } else {
      store.addNote(dateKey, { text, cat, author: me?.id });
    }
    setRepeat("none");
    setText("");
  };

  const onUpload = (e, noteId) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(urls => {
      if (noteId) {
        const note = notes.find(n => n.id === noteId);
        store.updateNote(dateKey, noteId, { images: [...(note?.images || []), ...urls] });
      } else {
        // Attach to a generic image-only note for this day
        store.addNote(dateKey, { text: `อัปโหลด ${urls.length} ไฟล์`, cat, author: me?.id, images: urls });
      }
    });
    e.target.value = "";
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{fmt.longThai(dateKey)}</h2>
            <div className="day-meta">
              {notes.length} งาน · <strong style={{ color: "var(--green)" }}>{done} เสร็จ</strong> · {notes.length - done} ค้าง
              {allImages.length > 0 && <> · {allImages.length} รูป</>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>
        </div>

        <div style={{ borderBottom: "1px solid var(--border)", padding: "0 26px" }}>
          <div className="tab-row" style={{ borderBottom: "none", marginBottom: 0 }}>
            <button className={"tab " + (tab === "notes" ? "active" : "")} onClick={() => setTab("notes")}>
              งาน &amp; โน้ต ({notes.length})
            </button>
            <button className={"tab " + (tab === "images" ? "active" : "")} onClick={() => setTab("images")}>
              รูปและไฟล์แนบ ({allImages.length})
            </button>
          </div>
        </div>

        <div className="modal-body">
          {tab === "notes" && (
            <>
              {scheduledTasks.length > 0 && (
                <div className="sched-tasks-section">
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <h3 className="h-section" style={{ margin: 0, fontSize: 13 }}>
                      <Icon name="check" size={13}/> งานที่กำหนดวันนี้ <span className="count">{scheduledTasks.length}</span>
                    </h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {scheduledTasks.map(t => <ScheduledTaskItem key={t.id} task={t} state={state}/>)}
                  </div>
                  <div className="divider"></div>
                </div>
              )}
              {notes.length === 0 && scheduledTasks.length === 0 && (
                <div className="empty" style={{ padding: "20px 0" }}>
                  ยังไม่มีงานหรือโน้ตในวันนี้<br/>
                  <span style={{ fontSize: 11 }}>เพิ่มข้างล่าง หรือลากจากลิสต์งานในแผงด้านข้าง</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {notes.map(n => (
                  <NoteItem key={n.id} note={n} dateKey={dateKey} state={state}
                    openLightbox={openLightbox} onUpload={onUpload}/>
                ))}
              </div>

              <div className="note-add">
                <textarea className="textarea" placeholder="เพิ่มสิ่งที่ต้องทำในวันนี้…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}/>

                <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <select className="select" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }} value={cat} onChange={e => setCat(e.target.value)}>
                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="repeat-group">
                    <button type="button" className={"repeat-opt " + (repeat === "none" ? "active" : "")} onClick={() => setRepeat("none")}>ครั้งเดียว</button>
                    <button type="button" className={"repeat-opt " + (repeat === "month" ? "active" : "")} onClick={() => setRepeat("month")} title="สร้างงานทุกวันของเดือนนี้">ทุกวันของเดือน</button>
                    <button type="button" className={"repeat-opt " + (repeat === "yearly" ? "active" : "")} onClick={() => setRepeat("yearly")} title="สร้างงานวันที่นี้ของทุกเดือน">วันนี้ของทุกเดือน</button>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>⌘+Enter</span>
                  <span style={{ flex: 1 }}></span>
                  <button className="btn primary sm" onClick={submit} disabled={!text.trim()}>
                    <Icon name="plus" size={12}/> {repeat === "month" ? "เพิ่มทั้งเดือน" : repeat === "yearly" ? "เพิ่มทุกเดือน" : "เพิ่มงาน"}
                  </button>
                </div>

                {repeat === "month" && (
                  <div className="repeat-banner amber">
                    ⚡ งานนี้จะถูกสร้างในทุกวันของเดือนนี้ ({(() => { const {y,m} = fmt.parseKey(dateKey); return new Date(y, m+1, 0).getDate(); })()} วัน) — เช็คเสร็จ/ลบแยกกันได้แต่ละวัน
                  </div>
                )}
                {repeat === "yearly" && (
                  <div className="repeat-banner violet">
                    🔁 งานนี้จะถูกสร้างในวันที่ {fmt.parseKey(dateKey).d} ของทุกเดือน (12 เดือนถัดไป)
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "images" && (
            <div>
              <div className="image-grid">
                <label className="image-tile upload">
                  <input type="file" multiple accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={(e) => onUpload(e, null)}/>
                  <Icon name="upload" size={22}/>
                  <div>คลิกหรือลากไฟล์มาวาง</div>
                  <div style={{ fontSize: 10, color: "var(--muted-2)" }}>PNG, JPG, GIF</div>
                </label>
                {allImages.map((img, i) => (
                  <div key={i} className="image-tile" onClick={() => openLightbox(allImages.map(x => x.src), img.src)} style={{ cursor: "zoom-in" }}>
                    {img.src === "placeholder"
                      ? <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--indigo), var(--pink))" }}/>
                      : <img src={img.src} alt=""/>
                    }
                    <button className="del" onClick={(e) => {
                      e.stopPropagation();
                      const note = notes.find(n => n.id === img.noteId);
                      if (!note) return;
                      store.updateNote(dateKey, img.noteId, { images: note.images.filter(s => s !== img.src) });
                    }}><Icon name="x" size={12}/></button>
                  </div>
                ))}
                {allImages.length === 0 && (
                  <div style={{ gridColumn: "span 3", color: "var(--muted)", fontSize: 12, textAlign: "center", padding: 20 }}>
                    ยังไม่มีรูปสำหรับวันนี้
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            <Icon name="github" size={11} style={{ verticalAlign: "middle" }}/> ทุกการเปลี่ยนแปลง sync ไปยัง github
          </div>
          <button className="btn" onClick={onClose}>ปิด</button>
        </div>
      </div>
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={i => setLightbox(lb => ({ ...lb, index: i }))}
        />
      )}
    </div>
  );
}

function Lightbox({ images, index, onClose, onChange }) {
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft")  onChange((index - 1 + images.length) % images.length);
      else if (e.key === "ArrowRight") onChange((index + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images, onChange, onClose]);

  const src = images[index];
  const prev = () => onChange((index - 1 + images.length) % images.length);
  const next = () => onChange((index + 1) % images.length);

  return (
    <div className="lightbox" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <button className="lb-close" onClick={onClose} title="Esc"><Icon name="x" size={20}/></button>
      <div className="lb-counter">{index + 1} / {images.length}</div>

      {images.length > 1 && (
        <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); prev(); }} title="←">
          <Icon name="chevL" size={26}/>
        </button>
      )}
      <img className="lb-img" src={src} alt="" onClick={(e) => e.stopPropagation()}/>
      {images.length > 1 && (
        <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); next(); }} title="→">
          <Icon name="chevR" size={26}/>
        </button>
      )}

      <div className="lb-actions" onClick={(e) => e.stopPropagation()}>
        <a className="btn sm" href={src} download={`image-${index+1}.png`} target="_blank" rel="noreferrer">
          <Icon name="upload" size={12} style={{ transform: "rotate(180deg)" }}/> ดาวน์โหลด
        </a>
        <a className="btn sm" href={src} target="_blank" rel="noreferrer">
          <Icon name="eye" size={12}/> เปิดในแท็บใหม่
        </a>
      </div>

      {images.length > 1 && (
        <div className="lb-strip" onClick={(e) => e.stopPropagation()}>
          {images.map((s, i) => (
            <img key={i} src={s} alt="" className={i === index ? "active" : ""} onClick={() => onChange(i)}/>
          ))}
        </div>
      )}
    </div>
  );
}

window.CalendarScreen = CalendarScreen;
