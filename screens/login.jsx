/* eslint-disable */
// Login screen — email + 4-digit PIN. Plus "request access" flow that goes
// into a pending queue admin must approve.

function LoginScreen() {
  const state = useStore();
  const [mode, setMode] = React.useState("signin"); // signin | request | requested
  const [email, setEmail] = React.useState("");
  const [pin, setPin] = React.useState(["", "", "", ""]);
  const [name, setName] = React.useState("");
  const [err, setErr] = React.useState("");
  const pinRefs = React.useRef([]);

  const fullPin = pin.join("");

  const onPinChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...pin];
    next[i] = v;
    setPin(next);
    setErr("");
    if (v && i < 3) pinRefs.current[i+1]?.focus();
  };
  const onPinKey = (i, e) => {
    if (e.key === "Backspace" && !pin[i] && i > 0) pinRefs.current[i-1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) pinRefs.current[i-1]?.focus();
    if (e.key === "ArrowRight" && i < 3) pinRefs.current[i+1]?.focus();
    if (e.key === "Enter" && fullPin.length === 4) submitSignin();
  };
  const onPinPaste = (e) => {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g,"").slice(0,4);
    if (!text) return;
    e.preventDefault();
    const next = ["","","",""];
    text.split("").forEach((c, i) => next[i] = c);
    setPin(next);
    pinRefs.current[Math.min(text.length, 3)]?.focus();
  };

  const submitSignin = () => {
    if (!email.trim()) { setErr("กรุณากรอกอีเมล"); return; }
    if (fullPin.length !== 4) { setErr("กรุณากรอก PIN 4 หลัก"); return; }
    const res = store.login(email, fullPin);
    if (res.error === "not_found") setErr("ไม่พบอีเมลนี้ในระบบ — ส่งคำขอเข้าใช้งานเพื่อให้แอดมินอนุญาต");
    else if (res.error === "pending") setErr("อีเมลนี้กำลังรอแอดมินอนุมัติ — กรุณารอการอนุมัติก่อน");
    else if (res.error === "bad_pin") { setErr("PIN ไม่ถูกต้อง"); setPin(["","","",""]); pinRefs.current[0]?.focus(); }
  };

  const submitRequest = async () => {
    if (!email.trim() || !name.trim()) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    if (fullPin.length !== 4) { setErr("กรุณาตั้ง PIN 4 หลัก"); return; }

    // Save locally first (in case admin opens this same browser)
    const res = store.requestAccess({ email, name, pin: fullPin });
    if (res.error === "exists") { setErr("อีเมลนี้มีในระบบอยู่แล้ว — กดเข้าสู่ระบบ"); return; }
    if (res.error === "already_pending") { setErr("อีเมลนี้ส่งคำขอไว้แล้ว — รอแอดมินอนุมัติ"); return; }

    // Send email to admin via FormSubmit.co (free, no API key)
    try {
      await fetch("https://formsubmit.co/ajax/wiptown@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: "[4KING SOCUTE] คำขอเข้าใช้งานใหม่: " + name,
          _captcha: "false",
          ชื่อ: name,
          อีเมล: email,
          PIN: fullPin,
          เวลา: new Date().toLocaleString("th-TH"),
          message: `มีคนขอเข้าใช้งานเว็บ 4KING SOCUTE Calendar\n\nชื่อ: ${name}\nอีเมล: ${email}\nPIN: ${fullPin}\n\nกรุณาเข้า Admin Panel → ผู้ใช้งาน → เพิ่มผู้ใช้ใหม่ ด้วยข้อมูลข้างต้น`,
        }),
      });
    } catch (e) {
      // network error — local save still went through
      console.warn("FormSubmit failed", e);
    }

    setMode("requested");
  };

  const quick = (em, p) => {
    setEmail(em);
    setPin(p.split(""));
    setErr("");
    setTimeout(() => { store.login(em, p); }, 100);
  };

  return (
    <div className="login-shell">
      <div className="login-art">
        <div className="hero" style={{ backgroundImage: `url(${state.heroImage})` }}></div>
        <div className="overlay">
          <div className="brand">
            <div className="logo"><img src="assets/logo.png" alt="4KING SOCUTE"/></div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap" }}>4KING SOCUTE</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1.2 }}>CALENDAR HUB</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: "#ffd76a", marginBottom: 12, textTransform: "uppercase" }}>
              ◆ INTERNAL TEAM PORTAL
            </div>
            <div className="quote">
              ปฏิทินกลางของทีม 4KING SOCUTE<br/>
              <em>โน้ตงาน · ติดตามสถานะ · แชร์ไฟล์</em><br/>
              ในที่เดียว
            </div>
          </div>
          <div className="credit">
            <div>v2.0 · {new Date().toLocaleDateString("en-GB")}</div>
            <div>·</div>
            <div>sync via github.com/4kingsocute/calendar-hub</div>
          </div>
        </div>
      </div>

      <div className="login-form-wrap">
        {mode === "signin" && (
          <div className="login-form">
            <div>
              <h1>เข้าสู่ระบบ</h1>
              <p className="lede">เข้าใช้งานด้วยชื่อผู้ใช้และ PIN 4 หลัก</p>
            </div>

            <div className="field">
              <label>ผู้ใช้ / อีเมล</label>
              <input
                className="input"
                type="text"
                placeholder="admin"
                value={email}
                onChange={e => { setEmail(e.target.value); setErr(""); }}
                onKeyDown={e => { if (e.key === "Enter") pinRefs.current[0]?.focus(); }}
                autoFocus
              />
            </div>

            <div className="field">
              <label>PIN 4 หลัก</label>
              <div className="pin-row">
                {[0,1,2,3].map(i => (
                  <input
                    key={i}
                    ref={el => pinRefs.current[i] = el}
                    className="pin-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[i]}
                    onChange={e => onPinChange(i, e.target.value)}
                    onKeyDown={e => onPinKey(i, e)}
                    onPaste={i === 0 ? onPinPaste : undefined}
                  />
                ))}
              </div>
            </div>

            {err && (
              <div className="login-err">{err}</div>
            )}

            <button className="btn primary" type="button" onClick={submitSignin} style={{ justifyContent: "center", padding: "11px 14px" }}>
              เข้าสู่ระบบ
              <Icon name="chevR" size={14} />
            </button>

            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 4 }}>
              ยังไม่มีบัญชี? <a className="link" onClick={() => { setMode("request"); setErr(""); setPin(["","","",""]); }}>ส่งคำขอเข้าใช้งาน</a>
            </div>
          </div>
        )}

        {mode === "request" && (
          <div className="login-form">
            <div>
              <h1>ขอเข้าใช้งาน</h1>
              <p className="lede">กรอกข้อมูลเพื่อส่งคำขอ — แอดมินจะตรวจสอบและอนุมัติให้</p>
            </div>

            <div className="field">
              <label>ชื่อ-นามสกุล</label>
              <input className="input" placeholder="เช่น สมชาย ใจดี" value={name} onChange={e => { setName(e.target.value); setErr(""); }} autoFocus/>
            </div>
            <div className="field">
              <label>อีเมลของคุณ</label>
              <input className="input" type="email" placeholder="you@wiptown.co" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }}/>
            </div>
            <div className="field">
              <label>ตั้ง PIN 4 หลัก</label>
              <div className="pin-row">
                {[0,1,2,3].map(i => (
                  <input key={i}
                    ref={el => pinRefs.current[i] = el}
                    className="pin-input"
                    type="tel" inputMode="numeric" maxLength={1}
                    value={pin[i]}
                    onChange={e => onPinChange(i, e.target.value)}
                    onKeyDown={e => onPinKey(i, e)}
                    onPaste={i === 0 ? onPinPaste : undefined}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>จดจำ PIN ไว้ใช้เข้าสู่ระบบหลังจากได้รับอนุมัติ</div>
            </div>

            {err && <div className="login-err">{err}</div>}

            <button className="btn primary" type="button" onClick={submitRequest} style={{ justifyContent: "center", padding: "11px 14px" }}>
              ส่งคำขอ
            </button>
            <div style={{ textAlign: "center" }}>
              <a className="link" onClick={() => { setMode("signin"); setErr(""); setPin(["","","",""]); }}>← กลับไปเข้าสู่ระบบ</a>
            </div>
          </div>
        )}

        {mode === "requested" && (
          <div className="login-form" style={{ alignItems: "center", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)", display: "grid", placeItems: "center", color: "var(--green)" }}>
              <Icon name="check" size={28} stroke={3}/>
            </div>
            <h1 style={{ margin: 0 }}>ส่งคำขอแล้ว</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 360 }}>
              คำขอของ <strong style={{ color: "var(--text)" }}>{email}</strong> ถูกส่งทางอีเมลให้แอดมินแล้ว
              เมื่อได้รับอนุมัติ คุณจะสามารถเข้าสู่ระบบด้วย PIN ที่ตั้งไว้
            </p>
            <div style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", padding: 10, borderRadius: 8, maxWidth: 340 }}>
              📧 แอดมินจะได้รับอีเมลแจ้งเตือนที่ <strong>wiptown@gmail.com</strong>
            </div>
            <button className="btn" onClick={() => { setMode("signin"); setEmail(""); setName(""); setPin(["","","",""]); setErr(""); }}>
              ← กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
window.LoginScreen = LoginScreen;
