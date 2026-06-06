# 🌸 4KING SOCUTE · Calendar Hub

เว็บปฏิทินงานสำหรับทีม **4KING SOCUTE** — โน้ตงานรายวัน, สถานะ, แนบรูป, ระบบล็อกอินด้วย PIN, ฟีดอัปเดตอัตโนมัติ และ cloud sync

โปรเจกต์นี้เป็น **static HTML + React (CDN) + Babel ใน browser** — ไม่ต้อง build ไม่ต้องลง dependency อะไรเลย เปิดผ่าน HTTP server ก็ใช้ได้ทันที

---

## 🗂 โครงสร้างไฟล์

```
.
├── index.html        ← entry point เปิดไฟล์นี้
├── app.jsx           ← main shell + routing + tweaks
├── store.jsx         ← state management + seed data + cloud sync (JSONBin)
├── styles.css        ← ธีมสีชมพู (pink / rose / gold)
├── tweaks-panel.jsx  ← Tweaks panel (dark/light, accent hue)
├── screens/
│   ├── login.jsx     ← เข้าสู่ระบบด้วย user + PIN
│   ├── home.jsx      ← Hero + Announcements + Feed
│   ├── calendar.jsx  ← ปฏิทินรายเดือน + Day detail
│   ├── admin.jsx     ← จัดการประกาศ / users / categories / hero / pending
│   └── profile.jsx   ← Profile + Settings + Sync
└── assets/
    ├── logo.png      ← โลโก้ 4KING SOCUTE
    ├── hero.png      ← รูป hero (พื้นชมพู + โลโก้)
    └── favicon.png
```

---

## 🚀 รันในเครื่อง (VS Code)

### Live Server (แนะนำ)
1. เปิดโฟลเดอร์ใน VS Code → `File → Open Folder…`
2. ติดตั้ง extension **Live Server** (Ritwick Dey)
3. คลิกขวา `index.html` → **Open with Live Server**

### หรือใช้ Python / Node
```bash
python3 -m http.server 8080      # แล้วเปิด http://localhost:8080
# หรือ
npx serve .
```

> ⚠️ อย่าเปิดแบบ `file://` ตรง ๆ — browser จะ block การโหลด `.jsx` ผ่าน `<script src>` ต้องเปิดผ่าน HTTP server

---

## ☁️ Deploy ผ่าน GitHub Pages (ฟรี)

### 1) สร้าง repository
ไปที่ [github.com](https://github.com) → **New repository** → ตั้งชื่อ เช่น `4kingsocute-calendar` → เลือก **Public** → **Create**

### 2) Push code ขึ้น GitHub
เปิด Terminal ที่โฟลเดอร์โปรเจกต์ แล้วรัน (แทน `<YOUR_USERNAME>` ด้วย username ของคุณ):
```bash
git init
git add .
git commit -m "init: 4KING SOCUTE calendar hub"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/4kingsocute-calendar.git
git push -u origin main
```

### 3) เปิด GitHub Pages
repo → **Settings** → **Pages** → Build and deployment:
- Source: **Deploy from a branch**
- Branch: **main** / **/ (root)** → **Save**

รอ 1–2 นาที จะได้ลิงก์ (entry คือ `index.html` จึงเข้าที่ root ได้เลย):
```
https://<YOUR_USERNAME>.github.io/4kingsocute-calendar/
```

### 4) Update ครั้งต่อ ๆ ไป
```bash
git add .
git commit -m "feat: อัปเดตอะไรบางอย่าง"
git push
```
GitHub Pages จะ deploy ใหม่อัตโนมัติภายใน 1–2 นาที

---

## 👤 บัญชีทดลอง (Demo Account)

| ผู้ใช้ | PIN | ยศ |
|---|---|---|
| `admin` | `1111` | Admin |

> เข้าสู่ระบบด้วย user **`admin`** และ PIN **`1111`**
> อีเมลใหม่ที่กด "ส่งคำขอเข้าใช้งาน" จะเข้าคิวรอ Admin อนุมัติที่แท็บ **Admin → คำขอเข้าใช้งาน**

---

## 🔧 ข้อมูลเก็บที่ไหน — Cloud Sync (JSONBin)

ข้อมูลถูก sync ขึ้น **JSONBin.io** อัตโนมัติ (ตั้งค่า bin id + master key ไว้แล้วในไฟล์ `store.jsx`) และ fallback เป็น `localStorage` ของเบราว์เซอร์

- เปลี่ยน/ดูค่า cloud ได้ที่หัวไฟล์ `store.jsx` → ตัวแปร `CLOUD`
- ทุกการแก้ไข (โน้ต, ประกาศ, users) จะ push ขึ้น cloud และ pull กลับทุก ๆ 30 วินาที
- การกด **Reset seed data** ใน Tweaks จะล้างและ seed ข้อมูลใหม่ทั้ง local และ cloud

---

## 🎨 ปรับ Tweaks
ไอคอน Tweaks มุมขวาล่าง — ปรับ **Dark / Light**, **Hue** ของสีหลัก (ค่าเริ่มต้น = ชมพู), และ **Reset seed data**

---

## 📝 License
Internal use — 4KING SOCUTE team
