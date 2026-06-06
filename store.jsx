/* eslint-disable */
// Data store + seed data + small SVG icons + CLOUD SYNC via JSONBin.io

// =====================================================================
// ☁️  CLOUD SYNC CONFIG — paste your JSONBin.io credentials here
// =====================================================================
// 1. Sign up at https://jsonbin.io (free, with Google)
// 2. Create a new bin with this initial content: {"_init": true}
// 3. Copy the "BIN ID" (in the bin URL after /b/) and paste below
// 4. Copy "X-Master-Key" (from your account page) and paste below
// 5. Save this file & push. Sync will activate automatically.
// =====================================================================
const CLOUD = {
  binId:  "6a0d0c036610dd3ae872cd45",   // ตัวอย่าง: "6638abc1234e5f001234abcd"
  apiKey: "$2a$10$8ll9pq4g1yxh4hxzJR29YuUaSROu/C/Ul6LYcjNEWctmLfZeMnXvG",   // ตัวอย่าง: "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxx"
};
const CLOUD_ENABLED = !!(CLOUD.binId && CLOUD.apiKey);

async function cloudLoad() {
  if (!CLOUD_ENABLED) return null;
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${CLOUD.binId}/latest`, {
      headers: { "X-Master-Key": CLOUD.apiKey, "X-Bin-Meta": "false" }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return data && !data._init ? data : null;
  } catch (e) {
    console.warn("[cloud] load failed:", e);
    return null;
  }
}

let _cloudTimer = null;
async function cloudPush(state) {
  if (!CLOUD_ENABLED) return;
  clearTimeout(_cloudTimer);
  _cloudTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${CLOUD.binId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Master-Key": CLOUD.apiKey },
        body: JSON.stringify({ ...state, currentUserId: undefined })  // don't sync who is logged in
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    } catch (e) {
      console.warn("[cloud] push failed:", e);
    }
  }, 1500);
}

// ---------- SEED DATA ----------
const SEED_USERS = [
  { id: "u1", email: "admin", name: "4KING SOCUTE Admin", role: "admin", pin: "1111", joined: "2026-05-20" },
];

const SEED_PENDING = [];

const SEED_CATEGORIES = [
  { id: "c-main",    name: "ลิสต์งานหลัก",       color: "#f0457e" },
  { id: "c-dev",     name: "ลิสต์งาน DEV",      color: "#34d399" },
  { id: "c-admin",   name: "ลิสต์งาน ADMIN",    color: "#fb7185" },
  { id: "c-graphic", name: "ลิสต์งาน GRAPHIC",  color: "#f9a8d4" },
  { id: "c-gacha",   name: "GACHA",              color: "#fbbf24" },
  { id: "c-car",     name: "รถ",                 color: "#fb6fb0" },
];

const SEED_ANNOUNCEMENTS = [
  {
    id: "a1",
    title: "ยินดีต้อนรับสู่ 4KING SOCUTE Calendar Hub",
    body: "ระบบปฏิทินกลางของทีม — จดโน้ตงานประจำวัน ติดตามสถานะ แนบรูปอ้างอิง และลงประกาศได้จากหน้านี้",
    author: "u1",
    date: "2026-05-20",
    tag: "c-main",
    pinned: true,
  },
];

// Build notes spanning current month so calendar always looks alive
function seedNotesForCurrentMonth() {
  return {};
}

const SEED_ACTIVITY = [
  { id: "l1", who: "u1", action: "ติดตั้งระบบ", target: "ยินดีต้อนรับ เริ่มต้นได้เลยตอนนี้!", at: "2026-05-20 09:00" },
];

const DEFAULT_STATE = () => ({
  currentUserId: null,
  users: SEED_USERS,
  pending: SEED_PENDING,
  categories: SEED_CATEGORIES,
  owners: [
    { id: "o-team", name: "ทีมรวม",  color: "#f0457e" },
    { id: "o-dev",  name: "DEV",     color: "#34d399" },
    { id: "o-art",  name: "กราฟิก",  color: "#f9a8d4" },
  ],
  sideNotes: [],   // [{ id, text, at }]  — sticky notes
  sideTasks: [],   // [{ id, title, details, owner, done, at }]
  announcements: SEED_ANNOUNCEMENTS,
  notes: seedNotesForCurrentMonth(),
  activity: SEED_ACTIVITY,
  heroImage: "assets/hero.png",
  heroPresets: [
    "assets/hero.png",
    "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1600&q=80",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80",
  ],
  theme: "dark",
  sync: { status: "synced", lastSyncAt: new Date().toISOString(), repo: "4kingsocute/calendar-hub" },
});

// ---------- STORE ----------
const STORAGE_KEY = "wiptown_calendar_v13";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE();
    const data = JSON.parse(raw);
    // Always re-seed notes for current month, since seed depends on now()
    if (!data._notesMonth || data._notesMonth !== currentMonthKey()) {
      data.notes = { ...seedNotesForCurrentMonth(), ...(data.notes || {}) };
      data._notesMonth = currentMonthKey();
    }
    return { ...DEFAULT_STATE(), ...data };
  } catch (e) {
    return DEFAULT_STATE();
  }
}
function currentMonthKey() {
  const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`;
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _notesMonth: currentMonthKey() })); }
  catch (e) {}
}

const subscribers = new Set();
let _state = loadState();

const store = {
  get() { return _state; },
  set(updater) {
    const patch = typeof updater === "function" ? updater(_state) : updater;
    _state = { ..._state, ...patch };
    saveState(_state);
    cloudPush(_state);
    subscribers.forEach(fn => fn(_state));
  },
  subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  reset() { _state = DEFAULT_STATE(); saveState(_state); cloudPush(_state); subscribers.forEach(fn => fn(_state)); },

  async pullFromCloud() {
    if (!CLOUD_ENABLED) return false;
    const remote = await cloudLoad();
    if (!remote) return false;
    const currentUserId = _state.currentUserId;
    _state = { ...DEFAULT_STATE(), ...remote, currentUserId };
    saveState(_state);
    subscribers.forEach(fn => fn(_state));
    return true;
  },
  isCloudEnabled() { return CLOUD_ENABLED; },

  // Mutations
  login(email, pin) {
    const e = (email || "").trim().toLowerCase();
    let u = _state.users.find(x => x.email.toLowerCase() === e);
    // Built-in demo admin — always works (admin / 1111), even after cloud sync
    if (!u && e === "admin" && String(pin) === "1111") {
      u = { id: "u-admin", email: "admin", name: "4KING SOCUTE Admin", role: "admin", pin: "1111", joined: "2026-05-20" };
      store.set(s => ({ users: [u, ...s.users.filter(x => x.email.toLowerCase() !== "admin")], currentUserId: u.id }));
      store.log(u.id, "เข้าสู่ระบบ", u.email);
      return { user: u };
    }
    if (!u) {
      const isPending = _state.pending.find(p => p.email.toLowerCase() === e);
      return { error: isPending ? "pending" : "not_found" };
    }
    if (pin !== undefined && String(u.pin) !== String(pin)) {
      return { error: "bad_pin" };
    }
    store.set({ currentUserId: u.id });
    store.log(u.id, "เข้าสู่ระบบ", u.email);
    return { user: u };
  },
  requestAccess({ email, name, pin }) {
    const e = (email || "").trim().toLowerCase();
    if (_state.users.find(u => u.email.toLowerCase() === e)) return { error: "exists" };
    if (_state.pending.find(p => p.email.toLowerCase() === e)) return { error: "already_pending" };
    const req = { id: "p" + Date.now(), email, name, pin, requestedAt: nowFull() };
    store.set(s => ({ pending: [req, ...s.pending] }));
    store.log(null, "ยื่นขอเข้าใช้งาน", email);
    return { ok: true };
  },
  approvePending(id, role = "member") {
    const me = store.me();
    const req = _state.pending.find(p => p.id === id);
    if (!req) return;
    const newUser = { id: "u" + Date.now(), email: req.email, name: req.name, pin: req.pin, role, joined: todayLocal() };
    store.set(s => ({ users: [...s.users, newUser], pending: s.pending.filter(p => p.id !== id) }));
    store.log(me?.id, "อนุมัติผู้ใช้ใหม่", req.email + " (" + role + ")");
    store.markSyncing();
  },
  rejectPending(id) {
    const me = store.me();
    const req = _state.pending.find(p => p.id === id);
    store.set(s => ({ pending: s.pending.filter(p => p.id !== id) }));
    store.log(me?.id, "ปฏิเสธคำขอเข้าใช้งาน", req?.email || id);
    store.markSyncing();
  },
  logout() { store.set({ currentUserId: null }); },
  user(id) { return _state.users.find(u => u.id === id); },
  me() { return _state.users.find(u => u.id === _state.currentUserId); },
  category(id) { return _state.categories.find(c => c.id === id); },

  // Notes
  addNote(dateKey, note) {
    const me = store.me();
    const next = { ..._state.notes };
    const newNote = { id: "n" + Date.now(), images: [], done: false, ...note, at: note.at || nowHM() };
    next[dateKey] = [...(next[dateKey] || []), newNote];
    store.set({ notes: next });
    store.log(me?.id, "เพิ่มงาน", newNote.text, { dateKey, kind: "add", noteId: newNote.id });
    store.markSyncing();
  },
  updateNote(dateKey, noteId, patch) {
    const me = store.me();
    const prev = (_state.notes[dateKey] || []).find(n => n.id === noteId);
    const next = { ..._state.notes };
    next[dateKey] = (next[dateKey] || []).map(n => n.id === noteId ? { ...n, ...patch } : n);
    store.set({ notes: next });
    // Smart log: completion / edit / image add
    if (patch.done !== undefined && prev?.done !== patch.done) {
      store.log(me?.id, patch.done ? "ปิดงาน" : "เปิดงานอีกครั้ง", prev?.text || "", { dateKey, kind: patch.done ? "done" : "undone", noteId });
    } else if (patch.images && (patch.images.length || 0) > (prev?.images?.length || 0)) {
      const added = patch.images.length - (prev?.images?.length || 0);
      store.log(me?.id, "อัปโหลดรูป", `${added} ไฟล์ · ${prev?.text || ""}`, { dateKey, kind: "image", noteId });
    } else if (patch.text) {
      store.log(me?.id, "แก้ไขโน้ต", patch.text, { dateKey, kind: "edit", noteId });
    }
    store.markSyncing();
  },
  removeNote(dateKey, noteId) {
    const me = store.me();
    const prev = (_state.notes[dateKey] || []).find(n => n.id === noteId);
    const next = { ..._state.notes };
    next[dateKey] = (next[dateKey] || []).filter(n => n.id !== noteId);
    if (next[dateKey].length === 0) delete next[dateKey];
    store.set({ notes: next });
    store.log(me?.id, "ลบโน้ต", prev?.text || "", { dateKey, kind: "remove" });
    store.markSyncing();
  },

  // Note replies (comments)
  addNoteReply(dateKey, noteId, text) {
    const me = store.me();
    const next = { ..._state.notes };
    next[dateKey] = (next[dateKey] || []).map(n =>
      n.id === noteId
        ? { ...n, replies: [...(n.replies || []), { id: "r" + Date.now(), text, author: me?.id, at: nowFull() }] }
        : n
    );
    store.set({ notes: next });
    store.log(me?.id, "ตอบกลับโน้ต", text.slice(0, 60), { dateKey, kind: "reply", noteId });
    store.markSyncing();
  },
  removeNoteReply(dateKey, noteId, replyId) {
    const next = { ..._state.notes };
    next[dateKey] = (next[dateKey] || []).map(n =>
      n.id === noteId ? { ...n, replies: (n.replies || []).filter(r => r.id !== replyId) } : n
    );
    store.set({ notes: next });
    store.markSyncing();
  },

  // Confirm a note as a task — creates a sideTask scheduled to this date
  confirmNoteAsTask(dateKey, noteId, ownerIds) {
    const note = (_state.notes[dateKey] || []).find(n => n.id === noteId);
    if (!note) return;
    const me = store.me();
    const ownersArr = Array.isArray(ownerIds) ? ownerIds.filter(Boolean) : (ownerIds ? [ownerIds] : []);
    const newTaskId = "st" + Date.now();
    const newTask = {
      id: newTaskId,
      title: note.text,
      details: (note.replies || []).map(r => {
        const u = _state.users.find(x => x.id === r.author);
        return `${u?.name?.split(" ")[0] || "?"}: ${r.text}`;
      }).join("\n"),
      owners: ownersArr,
      done: !!note.done,
      author: me?.id,
      at: nowFull(),
      scheduledOn: dateKey,
      fromNote: noteId,
    };
    const next = { ..._state.notes };
    next[dateKey] = (next[dateKey] || []).map(n =>
      n.id === noteId ? { ...n, confirmedTaskId: newTaskId, confirmedOwners: ownersArr } : n
    );
    store.set(s => ({ notes: next, sideTasks: [newTask, ...(s.sideTasks || [])] }));
    store.log(me?.id, "ยืนยันโน้ตเป็นงาน", note.text, { dateKey, kind: "confirm", noteId });
    store.markSyncing();
  },
  unconfirmNote(dateKey, noteId) {
    const note = (_state.notes[dateKey] || []).find(n => n.id === noteId);
    if (!note?.confirmedTaskId) return;
    const next = { ..._state.notes };
    next[dateKey] = (next[dateKey] || []).map(n =>
      n.id === noteId ? { ...n, confirmedTaskId: null, confirmedOwner: null } : n
    );
    store.set(s => ({
      notes: next,
      sideTasks: (s.sideTasks || []).filter(t => t.id !== note.confirmedTaskId)
    }));
    store.markSyncing();
  },

  // Announcements
  addAnnouncement(a) {
    const me = store.me();
    const next = [{ id: "a" + Date.now(), date: todayLocal(), author: me?.id, pinned: false, tag: "general", ...a }, ..._state.announcements];
    store.set({ announcements: next });
    store.log(me?.id, "ลงประกาศใหม่", a.title);
    store.markSyncing();
  },
  togglePinned(id) {
    store.set(s => ({ announcements: s.announcements.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a) }));
  },
  removeAnnouncement(id) {
    const me = store.me();
    const a = _state.announcements.find(x => x.id === id);
    store.set(s => ({ announcements: s.announcements.filter(x => x.id !== id) }));
    store.log(me?.id, "ลบประกาศ", a?.title || id);
    store.markSyncing();
  },

  // Categories
  addCategory(c) { store.set(s => ({ categories: [...s.categories, { id: "c-" + Date.now(), color: "#fb6fb0", ...c }] })); store.markSyncing(); },
  removeCategory(id) { store.set(s => ({ categories: s.categories.filter(c => c.id !== id) })); store.markSyncing(); },

  // Owners (ผู้รับผิดชอบ)
  addOwner(o) { store.set(s => ({ owners: [...(s.owners || []), { id: "o-" + Date.now(), color: "#34d399", ...o }] })); store.markSyncing(); },
  updateOwner(id, patch) { store.set(s => ({ owners: (s.owners || []).map(o => o.id === id ? { ...o, ...patch } : o) })); store.markSyncing(); },
  removeOwner(id) { store.set(s => ({ owners: (s.owners || []).filter(o => o.id !== id) })); store.markSyncing(); },

  // Side panel — Quick notes
  addSideNote(text) {
    const me = store.me();
    store.set(s => ({ sideNotes: [{ id: "sn" + Date.now(), text, author: me?.id, at: nowFull() }, ...(s.sideNotes || [])] }));
    store.markSyncing();
  },
  removeSideNote(id) { store.set(s => ({ sideNotes: (s.sideNotes || []).filter(n => n.id !== id) })); store.markSyncing(); },
  addSideNoteReply(noteId, text) {
    const me = store.me();
    store.set(s => ({
      sideNotes: (s.sideNotes || []).map(n =>
        n.id === noteId ? { ...n, replies: [...(n.replies || []), { id: "r" + Date.now(), text, author: me?.id, at: nowFull() }] } : n
      )
    }));
    store.markSyncing();
  },
  removeSideNoteReply(noteId, replyId) {
    store.set(s => ({
      sideNotes: (s.sideNotes || []).map(n =>
        n.id === noteId ? { ...n, replies: (n.replies || []).filter(r => r.id !== replyId) } : n
      )
    }));
    store.markSyncing();
  },
  // Convert a sticky note into a task in the side-panel task list
  confirmSideNoteAsTask(noteId, ownerIds) {
    const note = (_state.sideNotes || []).find(n => n.id === noteId);
    if (!note) return;
    const me = store.me();
    const ownersArr = Array.isArray(ownerIds) ? ownerIds.filter(Boolean) : (ownerIds ? [ownerIds] : []);
    const newTaskId = "st" + Date.now();
    const newTask = {
      id: newTaskId,
      title: note.text.split("\n")[0].slice(0, 80),
      details: note.text.split("\n").slice(1).join("\n") + (note.replies?.length ? "\n\n" + note.replies.map(r => {
        const u = _state.users.find(x => x.id === r.author);
        return `${u?.name?.split(" ")[0] || "?"}: ${r.text}`;
      }).join("\n") : ""),
      owners: ownersArr,
      done: false,
      author: me?.id,
      at: nowFull(),
      scheduledOn: null,
      fromSideNote: noteId,
      replies: note.replies || [],
    };
    store.set(s => ({
      sideNotes: (s.sideNotes || []).map(n =>
        n.id === noteId ? { ...n, confirmedTaskId: newTaskId, confirmedOwners: ownersArr } : n
      ),
      sideTasks: [newTask, ...(s.sideTasks || [])],
    }));
    store.log(me?.id, "ยืนยันโน้ตเป็นลิสต์งาน", note.text.slice(0, 60));
    store.markSyncing();
  },
  unconfirmSideNote(noteId) {
    const note = (_state.sideNotes || []).find(n => n.id === noteId);
    if (!note?.confirmedTaskId) return;
    store.set(s => ({
      sideNotes: (s.sideNotes || []).map(n =>
        n.id === noteId ? { ...n, confirmedTaskId: null, confirmedOwner: null } : n
      ),
      sideTasks: (s.sideTasks || []).filter(t => t.id !== note.confirmedTaskId),
    }));
    store.markSyncing();
  },

  // Side panel — Tasks
  addSideTask(task) {
    const me = store.me();
    store.set(s => ({ sideTasks: [{ id: "st" + Date.now(), done: false, author: me?.id, at: nowFull(), ...task }, ...(s.sideTasks || [])] }));
    store.markSyncing();
  },
  updateSideTask(id, patch) { store.set(s => ({ sideTasks: (s.sideTasks || []).map(t => t.id === id ? { ...t, ...patch } : t) })); store.markSyncing(); },
  removeSideTask(id) { store.set(s => ({ sideTasks: (s.sideTasks || []).filter(t => t.id !== id) })); store.markSyncing(); },
  addSideTaskReply(taskId, text) {
    const me = store.me();
    store.set(s => ({
      sideTasks: (s.sideTasks || []).map(t =>
        t.id === taskId ? { ...t, replies: [...(t.replies || []), { id: "r" + Date.now(), text, author: me?.id, at: nowFull() }] } : t
      )
    }));
    store.markSyncing();
  },
  removeSideTaskReply(taskId, replyId) {
    store.set(s => ({
      sideTasks: (s.sideTasks || []).map(t =>
        t.id === taskId ? { ...t, replies: (t.replies || []).filter(r => r.id !== replyId) } : t
      )
    }));
    store.markSyncing();
  },

  clearAllNotes() {
    const me = store.me();
    store.set({ notes: {} });
    store.log(me?.id, "ล้างปฏิทินทั้งหมด", "ลบงานทั้งหมดในปฏิทิน");
    store.markSyncing();
  },

  // Users
  addUser(u) {
    const me = store.me();
    store.set(s => ({ users: [...s.users, { id: "u" + Date.now(), role: "member", joined: todayLocal(), ...u }] }));
    store.log(me?.id, "เพิ่มผู้ใช้", u.email);
    store.markSyncing();
  },
  removeUser(id) {
    const me = store.me();
    const target = _state.users.find(u => u.id === id);
    store.set(s => ({ users: s.users.filter(u => u.id !== id) }));
    store.log(me?.id, "ลบผู้ใช้", target?.email || id);
    store.markSyncing();
  },
  setUserRole(id, role) {
    store.set(s => ({ users: s.users.map(u => u.id === id ? { ...u, role } : u) }));
    store.markSyncing();
  },
  updateUser(id, patch) {
    const me = store.me();
    store.set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...patch } : u) }));
    if (patch.name) store.log(me?.id, "แก้ไขโปรไฟล์", patch.name);
    store.markSyncing();
  },

  setHero(url) {
    const me = store.me();
    store.set({ heroImage: url });
    store.log(me?.id, "เปลี่ยน Hero image", "ใหม่");
    store.markSyncing();
  },
  addHeroPreset(url) {
    if (!url) return;
    store.set(s => ({ heroPresets: [...(s.heroPresets || []), url] }));
    store.markSyncing();
  },
  removeHeroPreset(url) {
    store.set(s => ({ heroPresets: (s.heroPresets || []).filter(p => p !== url) }));
    store.markSyncing();
  },

  log(who, action, target, link) {
    const entry = { id: "l" + Date.now() + Math.random().toString(36).slice(2,5), who, action, target, at: nowFull() };
    if (link) entry.link = link;
    store.set(s => ({ activity: [entry, ...s.activity].slice(0, 80) }));
  },

  setTheme(t) {
    store.set({ theme: t });
    document.documentElement.setAttribute("data-theme", t);
  },

  markSyncing() {
    store.set(s => ({ sync: { ...s.sync, status: "syncing" } }));
    clearTimeout(window.__syncTimer);
    window.__syncTimer = setTimeout(() => {
      store.set(s => ({ sync: { ...s.sync, status: "synced", lastSyncAt: new Date().toISOString() } }));
    }, 1200);
  },
  manualPush() {
    store.set(s => ({ sync: { ...s.sync, status: "syncing" } }));
    setTimeout(() => {
      store.set(s => ({ sync: { ...s.sync, status: "synced", lastSyncAt: new Date().toISOString() } }));
    }, 1800);
  },
};

function useStore() {
  const [state, setState] = React.useState(store.get());
  React.useEffect(() => store.subscribe(setState), []);
  return state;
}

// ---------- HELPERS ----------
// Get owner ids from a task — supports legacy single `owner` and new `owners` array
function getTaskOwners(task) {
  if (Array.isArray(task?.owners)) return task.owners;
  if (task?.owner) return [task.owner];
  return [];
}

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function nowFull() {
  const d = new Date();
  return `${todayLocal()} ${nowHM()}`;
}
// Local date as YYYY-MM-DD (avoids UTC off-by-one near midnight in TH timezone)
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DOW_TH = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const DOW_TH_FULL = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

const fmt = {
  dateKey(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; },
  parseKey(k) { const [y,m,d] = k.split("-").map(Number); return { y, m: m-1, d }; },
  longThai(k) {
    const { y, m, d } = fmt.parseKey(k);
    const date = new Date(y, m, d);
    return `${DOW_TH_FULL[date.getDay()]}ที่ ${d} ${THAI_MONTHS[m]} ${y + 543}`;
  },
  shortThai(d, m) { return `${d} ${THAI_MONTHS_SHORT[m]}`; },
  initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },
  relTime(iso) {
    const t = new Date(iso).getTime();
    const diff = (Date.now() - t) / 1000;
    if (diff < 60) return "เมื่อสักครู่";
    if (diff < 3600) return `${Math.floor(diff/60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff/3600)} ชม.ที่แล้ว`;
    return `${Math.floor(diff/86400)} วันที่แล้ว`;
  },
  thMonthYear(y, m) { return `${THAI_MONTHS[m]} ${y + 543}`; },
  thMonths: THAI_MONTHS,
  thMonthsShort: THAI_MONTHS_SHORT,
  dowShort: DOW_TH,
  dowFull: DOW_TH_FULL,
};

// ---------- ICONS (inline) ----------
const _i = {
  home: "M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2V11z",
  cal:  "M3 7h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 3v4M16 3v4",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 0 0 4 0",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  shield:"M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z",
  cog:  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 8.99 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.64 8.99a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.43.17.81.43 1.12.76",
  plus: "M12 5v14M5 12h14",
  check:"M5 12l4 4L19 7",
  x:    "M18 6L6 18M6 6l12 12",
  chevL:"M15 18l-6-6 6-6",
  chevR:"M9 18l6-6-6-6",
  pin:  "M12 17v5M9 3h6l-1 8h3l-5 6-5-6h3l-1-8z",
  trash:"M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  upload:"M12 19V5M5 12l7-7 7 7",
  img:  "M3 5h18v14H3zM3 16l5-5 5 5 3-3 5 5",
  github:"M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22",
  search:"M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z",
  filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  dot: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0 -4 0",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
};
function Icon({ name, size = 16, stroke = 2, className = "", style = {} }) {
  const d = _i[name] || _i.dot;
  const fill = name === "dot" ? "currentColor" : "none";
  return (
    <svg className={"ico " + className} style={{ width: size, height: size, ...style }} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d}></path>
    </svg>
  );
}

// ---------- EXPORT ----------
Object.assign(window, { store, useStore, Icon, fmt, getTaskOwners });

// On startup: try to pull from cloud (overrides local seed if cloud has data)
if (CLOUD_ENABLED) {
  store.pullFromCloud().then(ok => {
    if (ok) console.log("[cloud] synced from", CLOUD.binId);
    // Auto-refresh from cloud every 30s while page is open
    setInterval(() => { if (!document.hidden) store.pullFromCloud(); }, 30000);
  });
}
