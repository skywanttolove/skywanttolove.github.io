┌─────────────────────────────────────────────┐
│  SummarizeMe · Backend ฟรี (Ollama)          │
└─────────────────────────────────────────────┘

ทำให้แอปสรุปได้ "จริง" แบบฟรี 100% โดยรันทุกอย่างบนเครื่องตัวเอง
AI = Ollama · Transcript = youtube-transcript · ไฟล์ = pdf-parse + OCR (tesseract.js)


━━ 1. ติดตั้ง Ollama + โหลดโมเดล ━━
1) โหลด Ollama จาก  https://ollama.com/download  (Windows / Mac / Linux)
2) เปิดโปรแกรม แล้วสั่งโหลดโมเดล (พิมพ์ใน Terminal / PowerShell):

     ollama pull llama3.1

   • เครื่องแรม 8GB : ใช้โมเดลเล็กแทน →  ollama pull llama3.2:3b
   • อยากเก่งภาษาจีน/ญี่ปุ่น       →  ollama pull qwen2.5:7b

   (ทดสอบว่าใช้ได้:  ollama run llama3.1  แล้วพิมพ์คุยดู)


━━ 2. ติดตั้ง Node แล้วรัน backend ━━
1) ติดตั้ง Node.js 18+ จาก  https://nodejs.org
2) เปิด Terminal ที่โฟลเดอร์ backend นี้ แล้วรัน:

     npm install
     npm start

3) ถ้าขึ้น "🌸 SummarizeMe backend ▶ http://localhost:8787" = พร้อมใช้

   เปลี่ยนโมเดล/พอร์ตได้ด้วย env เช่น:
     MODEL=qwen2.5:7b PORT=8787 npm start


━━ 3. ต่อกับหน้าเว็บ ━━
เปิด SummarizeMe.html → กดไอคอน ⚙ (เฟือง) บนแถบบน → ใส่ Backend URL:

     http://localhost:8787

กด "ทดสอบการเชื่อมต่อ" ให้ขึ้นเขียว ✓ แล้วใช้งานได้เลย:
  • วางลิงก์ YouTube (คลิปที่มีซับ) → ดึง transcript → สรุปจริง
  • อัปโหลด PDF / รูปสไลด์          → แกะข้อความ/OCR → สรุปจริง
  • วางเลกเชอร์เป็นข้อความ          → สรุปจริง
  • แชตถาม AI                        → ตอบโดยอ้างอิงเนื้อหาจริง


━━ ปัญหาที่พบบ่อย ━━
• กดทดสอบแล้วแดง  → ยังไม่ได้เปิด Ollama หรือ backend / URL ผิด
• YouTube ดึงซับไม่ได้ → คลิปนั้นปิดคำบรรยาย ให้ก็อปข้อความมาวางในแท็บ "เลกเชอร์" แทน
• สรุปช้า           → โมเดลใหญ่/เครื่องไม่แรง ลองใช้ llama3.2:3b
• OCR ครั้งแรกช้า    → tesseract โหลดโมเดลภาษาครั้งแรก รอบต่อไปเร็วขึ้น


━━ อยากโฮสต์หน้าเว็บบน GitHub Pages ━━
วาง SummarizeMe.html ไว้ใน repo (เช่นโฟลเดอร์ /summarizeme/) → เปิด Pages
ได้ลิงก์  https://<username>.github.io/summarizeme/
ตัวหน้าเว็บฟรีบน Pages ได้ แต่ "backend Ollama ต้องรันบนเครื่องคุณเอง" (localhost)
เพราะ AI ประมวลผลในเครื่อง — เปิดเครื่อง+backend ไว้ตอนใช้งาน
