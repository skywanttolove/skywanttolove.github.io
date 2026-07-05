// ============================================================
//  SummarizeMe — Local FREE backend
//  AI: Ollama (บนเครื่องตัวเอง) · Transcript: youtube-transcript
//  ไฟล์: PDF (pdf-parse) + รูป/สไลด์ (tesseract.js OCR)
// ============================================================
//  รัน: 1) ติดตั้ง Ollama + `ollama pull llama3.1`
//       2) `npm install`  แล้ว  `npm start`
//       3) เปิดหน้าเว็บ แล้วตั้งค่า Backend URL = http://localhost:8787
// ============================================================

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { YoutubeTranscript } from 'youtube-transcript';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT       = process.env.PORT       || 8787;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
let   MODEL      = process.env.MODEL      || 'qwen2.5:7b';   // เก่งภาษาไทย/คณิตกว่า llama3.1 (มี fallback อัตโนมัติด้านล่าง)
const NUM_CTX    = +(process.env.NUM_CTX  || 8192);   // ต้องกว้างพอให้โมเดล "เห็น" เนื้อหายาว (ดีฟอลต์ Ollama = 2048 น้อยไป)
const KEEP_ALIVE = process.env.KEEP_ALIVE || '30m';   // คาโมเดลไว้ใน RAM สรุปครั้งถัดไปเร็วขึ้น

const app = express();
// รองรับ Private Network Access — ต้องมาก่อน cors() เพราะ cors จะตอบ preflight (OPTIONS) เอง
// ตั้ง header นี้ไว้บน res ก่อน แล้ว cors จะส่งมันไปพร้อมการตอบ ให้หน้าเว็บ https (github.io) เรียก http://localhost ได้
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  next();
});
app.use(cors());                          // อนุญาตให้หน้าเว็บ (github.io/localhost) เรียกได้
app.use(express.json({ limit: '8mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// เสิร์ฟไฟล์หน้าเว็บ (วาง SummarizeMe.html ไว้ในโฟลเดอร์ public/ ถ้าอยากให้ same-origin)
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helper: เรียก Ollama ----------
async function ollamaChat(messages, { json = false, num_predict = 1400, temperature = 0.3 } = {}) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      keep_alive: KEEP_ALIVE,
      ...(json ? { format: 'json' } : {}),
      options: {
        temperature,
        num_predict,
        num_ctx: NUM_CTX,     // ← กุญแจสำคัญ: ให้โมเดลอ่านเนื้อหายาวได้จริง ไม่ถูกตัดที่ 2048
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.message && data.message.content) || '';
}

// ตัดข้อความยาวเป็นก้อน (map-reduce) — กันเนื้อหายาวเกิน context แล้วโมเดลลืมตอนต้น
function chunkText(text, size = 6000) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= size) return [clean];
  const chunks = [];
  for (let i = 0; i < clean.length; i += size) chunks.push(clean.slice(i, i + size));
  return chunks;
}

// ย่อเนื้อหายาวหลายก้อนให้เหลือ "แก่นเนื้อหา" ก้อนเดียว ก่อนส่งไปสรุปเป็นสคีมา
async function condense(text, langName) {
  const chunks = chunkText(text);
  if (chunks.length === 1) return chunks[0];
  const notes = [];
  for (let i = 0; i < chunks.length; i++) {
    const part = await ollamaChat([{
      role: 'user',
      content: `ย่อเนื้อหาต่อไปนี้ให้กระชับเป็น ${langName} เก็บเฉพาะใจความหลัก นิยาม ตัวเลข ชื่อเฉพาะ และตัวอย่างสำคัญ ตอบเป็นย่อหน้าเนื้อความล้วน ห้ามมีคำเกริ่นนำ ห้ามทวนคำสั่งนี้ ห้ามขึ้นต้นด้วยคำว่า "เนื้อหา" หรือ "สรุป":\n\n${chunks[i]}`
    }], { num_predict: 550, temperature: 0.2 });
    // กันโมเดลเผลอทวนคำสั่ง/เกริ่นนำ มาปนใน title ตอนสรุปขั้นสุดท้าย
    const cleaned = part.trim()
      .replace(/^["'`\s]*(เนื้อหาส่วนที่|เนื้อหา|สรุป|โน้ต|นี่คือ|ต่อไปนี้)[^\n]*[:：]\s*/i, '')
      .trim();
    notes.push(cleaned);
  }
  return notes.join('\n\n');
}

// ซ่อม JSON ที่วงเล็บปิดขาด (โมเดลเล็กชอบลืมปิด ] หรือ })
function repairJson(s) {
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let out = s;
  while (stack.length) out += (stack.pop() === '{' ? '}' : ']');
  return out;
}

// parse JSON แบบทน — ลองตรงๆ ก่อน แล้วค่อยซ่อมวงเล็บ
function tolerantParse(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch {}
  try { return JSON.parse(repairJson(str)); } catch {}
  return null;
}

// ดึง JSON ออบเจกต์ก้อนแรกออกจากข้อความ (กัน markdown / ข้อความเกิน)
function extractJSON(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0) return null;
  return tolerantParse(s.slice(a, b > a ? b + 1 : undefined));
}

// ดึงชุด quiz ให้ได้มากที่สุด: รองรับทั้ง {"quiz":[...]}, array ล้วน,
// และเคส llama3.1 ที่พ่น {"quiz":[..]} ซ้ำหลายก้อน — กวาดทุก object ที่มี q+options
function extractQuiz(raw) {
  if (!raw) return [];
  const s = String(raw).replace(/```json/gi, '').replace(/```/g, '');
  const out = [];
  const seen = new Set();
  const re = /\{[^{}]*?"q"\s*:[^{}]*?"options"\s*:\s*\[[^\]]*\][^{}]*?\}/g;
  let m;
  while ((m = re.exec(s))) {
    const o = tolerantParse(m[0]);
    if (o && o.q && Array.isArray(o.options) && !seen.has(o.q)) {
      seen.add(o.q);
      out.push({ q: o.q, options: o.options, answer: +o.answer || 0, exp: o.exp || '' });
    }
  }
  return out;
}

// สรุปเชิงคุณภาพ: แยกสร้าง "เนื้อหา (blocks)" กับ "แบบทดสอบ (quiz)" คนละครั้ง
// เพราะโมเดล 8B ทำพร้อมกันมักได้ quiz ไม่ครบ — แยกแล้วคุมจำนวน/คุณภาพได้ชัวร์กว่า
async function summarizeSchema(material, langName) {
  const content = material.length > 6500 ? await condense(material, langName) : material;

  const blockPrompt =
    `คุณเป็นติวเตอร์ที่อธิบายเก่ง สรุปเนื้อหาต่อไปนี้เพื่อเตรียมสอบ ให้ "เข้าใจง่ายแต่ละเอียดครบถ้วน" ตอบเป็น ${langName} เท่านั้น และตอบกลับเป็น JSON ล้วนๆ (ไม่มีข้อความอื่น ไม่มี markdown) ` +
    `ตาม schema: {"title":string,"lead":string,"blocks":[{"cat":"key|warn|summary|def|sub|term","h":string,"items":[string]}]}\n` +
    `ข้อกำหนดคุณภาพ (สำคัญมาก):\n` +
    `- title: ชื่อหัวข้อที่ถูกต้องและเป็นธรรมชาติ ถ้าเป็นศัพท์เทคนิคให้ใช้คำที่ถูก (เช่น dot product = "ผลคูณเชิงสเกลาร์")\n` +
    `- lead: เกริ่นนำ 2-3 ประโยค บอกว่าเรื่องนี้คืออะไรและสำคัญอย่างไร\n` +
    `- แต่ละ item ต้องเป็น "ประโยคสมบูรณ์" ที่อ่านแล้วเข้าใจได้ด้วยตัวเอง อธิบายนิยาม เหตุผล วิธีทำ หรือยกตัวอย่างประกอบ ห้ามเขียนเป็นคำโดดๆ ตัวย่อ หรือสัญลักษณ์ที่อ่านแล้วงง\n` +
    `- ถ้ามีสูตร/ขั้นตอน/ตัวเลข ให้อธิบายความหมายของแต่ละส่วนด้วยภาษาคน\n` +
    `- ใช้ภาษาเข้าใจง่ายแต่ครบถ้วน ไม่ตัดทอนจนเสียใจความ\n` +
    `- cat: key=ใจความสำคัญ, warn=ข้อควรระวัง/จุดที่มักผิด, summary=สรุปรวบยอด, def=นิยาม/ทฤษฎี, sub=รายละเอียด/ตัวอย่าง, term=คำเฉพาะ/สูตร\n` +
    `สร้าง blocks 4-6 อัน แต่ละอันมี h ที่สื่อความ และ items 3-5 ข้อ (ห้ามใส่ quiz).\n\nเนื้อหา:\n${content}`;

  // quiz: ไม่ใช้ format:json (จะทำให้ llama3.1 พ่นก้อนละ 1 ข้อ) — ขอ array ตรงๆ แล้วกวาดเอา
  const quizPrompt =
    `จากเนื้อหาต่อไปนี้ ออกข้อสอบปรนัย 3 ข้อเพื่อทบทวน ตอบเป็น ${langName}. ` +
    `ตอบกลับเป็น JSON array ล้วนๆ (ไม่มีข้อความอื่น ไม่มี markdown) รูปแบบ: ` +
    `[{"q":"คำถาม","options":["ตัวเลือกA","ตัวเลือกB","ตัวเลือกC"],"answer":0,"exp":"เหตุผลสั้นๆ"}, {...}, {...}] ` +
    `โดย answer เป็นดัชนีตัวเลือกที่ถูก (0,1,2). ต้องมีครบ 3 ข้อ แต่ละข้อมี 3 ตัวเลือก.\n\nเนื้อหา:\n${content}`;

  const [rawB, rawQ] = await Promise.all([
    ollamaChat([{ role: 'user', content: blockPrompt }], { json: true,  num_predict: 5200 }),
    ollamaChat([{ role: 'user', content: quizPrompt }],  { json: false, num_predict: 1600 })
  ]);

  const b = extractJSON(rawB);
  if (!b || !Array.isArray(b.blocks)) return null;   // ให้ผู้เรียกไป fallback
  // กรองบล็อกที่ไม่สมบูรณ์ (โดนตัดกลางคัน) ออก กัน [undefined]
  const blocks = b.blocks.filter(x => x && typeof x.h === 'string' && x.h.trim() && Array.isArray(x.items) && x.items.filter(Boolean).length)
    .map(x => ({ cat: x.cat || 'key', h: x.h, items: x.items.filter(it => it && String(it).trim()) }));
  if (!blocks.length) return null;
  const quiz = extractQuiz(rawQ).slice(0, 5);
  return JSON.stringify({ title: b.title || '', lead: b.lead || '', blocks, quiz });
}

// ---------- Web search (DuckDuckGo HTML, ไม่ต้องมี API key) สำหรับอิงข้อสอบเก่าจริง ----------
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
async function ddgSearch(query, limit = 6) {
  const r = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), { headers: { 'User-Agent': UA } });
  const html = await r.text();
  const out = [];
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) && out.length < limit) {
    let href = m[1];
    const um = href.match(/uddg=([^&]+)/);
    if (um) href = decodeURIComponent(um[1]);
    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (/^https?:\/\//.test(href) && title) out.push({ title, url: href });
  }
  return out;
}
async function fetchText(url, max = 1800) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } });
    clearTimeout(to);
    if (!r.ok) return '';
    if (!/text|html/.test(r.headers.get('content-type') || '')) return '';
    let html = await r.text();
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  } catch { return ''; }
}

// ---------- health ----------
app.get('/api/health', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    const ok = r.ok;
    const tags = ok ? await r.json() : null;
    res.json({ ok, model: MODEL, models: tags?.models?.map(m => m.name) || [] });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'ต่อ Ollama ไม่ได้ — เปิด Ollama แล้วรึยัง? (' + e.message + ')' });
  }
});

// ---------- AI: chat / summarize ----------
// body: { system?, messages:[{role,content}], json?:bool }
app.post('/api/ai', async (req, res) => {
  try {
    const { system, messages = [] } = req.body || {};
    let json = !!(req.body && req.body.json);
    const full = system ? [{ role: 'system', content: system }, ...messages] : messages.slice();

    // ── สรุปเป็นสคีมา: ใช้ summarizer เฉพาะทาง (แยก blocks/quiz + บีบเนื้อหายาว) ──
    // หน้าเว็บส่ง prompt รูปแบบ "...ตอบเป็น <ภาษา>... เนื้อหา:\n<เนื้อหาจริง>" และขอ schema ที่มี "blocks"+"quiz"
    if (json && full.length) {
      const last = full[full.length - 1];
      const body = String(last && last.content || '');
      const idx = body.indexOf('เนื้อหา:\n');
      const isSummary = idx >= 0 && body.includes('"blocks"') && body.includes('"quiz"');
      if (isSummary) {
        const head = body.slice(0, idx + 'เนื้อหา:\n'.length);
        const material = body.slice(idx + 'เนื้อหา:\n'.length).trim();
        const m = head.match(/ตอบเป็น\s*([^\s]+)/);
        const langName = (m && m[1]) || 'ภาษาไทย';
        if (material.length > 30) {
          try {
            const out = await summarizeSchema(material, langName);
            if (out) return res.json({ text: out });   // สำเร็จ → ส่งผลคุณภาพสูงกลับเลย
          } catch (_) { /* ตกลงไป fallback ด้านล่าง */ }
        }
      }
    }

    // fallback / แชตทั่วไป — ยิงตรงแบบเดิม
    const text = await ollamaChat(full, { json, num_predict: json ? 4096 : 900 });
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Exam: ออกข้อสอบอิงข้อสอบเก่าจริงจากเว็บ + อ้างอิงแหล่ง ----------
// body: { topic, content?, lang? }  →  { quiz:[...], sources:[{title,url}] }
app.post('/api/exam', async (req, res) => {
  try {
    const { topic = '', content = '', lang = 'th' } = req.body || {};
    const langName = { th: 'ภาษาไทย', en: 'English', ja: '日本語', zh: '中文' }[lang] || 'ภาษาไทย';
    const t = String(topic || '').trim() || String(content || '').replace(/\s+/g, ' ').slice(0, 60).trim();
    if (!t) return res.status(400).json({ error: 'ต้องมีหัวข้อหรือเนื้อหา' });

    const q = t + (lang === 'en' ? ' past exam questions quiz with answers' : ' ข้อสอบเก่า แบบทดสอบ พร้อมเฉลย');
    let sources = [];
    try { sources = await ddgSearch(q, 6); } catch (_) { sources = []; }

    // ดึงเนื้อหาจากแหล่งจริงมาช่วย ground (best-effort บางเว็บโหลดไม่ได้ก็ข้าม)
    const grounds = [];
    for (const sc of sources.slice(0, 4)) {
      const txt = await fetchText(sc.url, 1500);
      if (txt && txt.length > 200) grounds.push('อ้างอิง: ' + sc.title + '\n' + txt);
      if (grounds.length >= 3) break;
    }
    const refBlock = (grounds.length ? grounds.join('\n\n---\n\n') : String(content || '').slice(0, 3000)).slice(0, 6500);

    const prompt =
      `คุณเป็นผู้ออกข้อสอบมืออาชีพ ด้านล่างคือเนื้อหาจาก "ข้อสอบเก่า/แบบทดสอบจริง" ที่ค้นจากอินเทอร์เน็ต เรื่อง "${t}" ` +
      `จงออกข้อสอบปรนัยแนวเดียวกับข้อสอบเก่าเหล่านี้ 5 ข้อ ตอบเป็น ${langName}. ` +
      `ตอบกลับเป็น JSON array ล้วนๆ (ไม่มีข้อความอื่น): [{"q":"คำถาม","options":["ตัวเลือกA","ตัวเลือกB","ตัวเลือกC","ตัวเลือกD"],"answer":0,"exp":"เฉลยพร้อมคำอธิบายสั้นๆ"}] ` +
      `โดย answer เป็นดัชนีตัวเลือกที่ถูก (0-3) แต่ละข้อมี 4 ตัวเลือก. เน้นจุดที่ข้อสอบมักออกและครอบคลุมเนื้อหา.\n\nเนื้อหาอ้างอิงจากข้อสอบจริง:\n` + refBlock;

    // วนสะสมข้อสอบ (unique) จนได้ครบ ~5 ข้อ (โมเดลเล็กบางรอบให้ไม่ครบ)
    const quiz = [];
    const seenQ = new Set();
    for (let attempt = 0; attempt < 3 && quiz.length < 5; attempt++) {
      const raw = await ollamaChat([{ role: 'user', content: prompt }], { json: false, num_predict: 2000, temperature: 0.4 });
      for (const item of extractQuiz(raw)) {
        const key = (item.q || '').slice(0, 40);
        if (key && !seenQ.has(key)) { seenQ.add(key); quiz.push(item); }
      }
    }
    res.json({ quiz: quiz.slice(0, 8), sources: sources.slice(0, 6), grounded: grounds.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- YouTube transcript ----------
// GET /api/transcript?url=...&lang=th
app.get('/api/transcript', async (req, res) => {
  try {
    const { url, lang } = req.query;
    if (!url) return res.status(400).json({ error: 'ต้องมี ?url=' });
    let items;
    try {
      items = await YoutubeTranscript.fetchTranscript(url, lang ? { lang } : undefined);
    } catch {
      items = await YoutubeTranscript.fetchTranscript(url); // ลองอีกครั้งแบบไม่ระบุภาษา
    }
    const text = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
    if (!text) throw new Error('ไม่พบคำบรรยาย');
    res.json({ text, length: text.length });
  } catch (e) {
    res.status(422).json({ error: 'ดึงคำบรรยายไม่ได้ (คลิปอาจปิดซับ) — ' + e.message });
  }
});

// ---------- File: PDF / image (OCR) ----------
app.post('/api/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ไม่มีไฟล์' });
    const { originalname, mimetype, buffer } = req.file;
    let text = '';

    if (mimetype === 'application/pdf' || /\.pdf$/i.test(originalname)) {
      const { default: pdfParse } = await import('pdf-parse');
      const data = await pdfParse(buffer);
      text = (data.text || '').trim();
    }

    // ถ้าเป็นรูป หรือ PDF ที่แกะข้อความไม่ได้ (สแกน/รูป) → OCR
    if (!text && (/^image\//.test(mimetype) || /\.(png|jpe?g|webp|bmp)$/i.test(originalname))) {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['tha', 'eng', 'jpn', 'chi_sim']);
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      text = (data.text || '').trim();
    }

    if (!text) throw new Error('แกะข้อความจากไฟล์ไม่ได้');
    res.json({ text, name: originalname, length: text.length });
  } catch (e) {
    res.status(422).json({ error: 'อ่านไฟล์ไม่ได้ — ' + e.message });
  }
});

// เลือกโมเดลอัตโนมัติ: ถ้าไม่พบโมเดลที่ตั้งไว้ ใช้ตัวที่มีในเครื่อง (เลือก qwen ก่อน)
async function resolveModel() {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!r.ok) return;
    const names = ((await r.json()).models || []).map(m => m.name);
    if (!names.length) return;
    const base = MODEL.split(':')[0];
    const has = names.some(n => n === MODEL || n.split(':')[0] === base);
    if (!has) {
      MODEL = names.find(n => /qwen/i.test(n)) || names.find(n => /llama/i.test(n)) || names[0];
      console.log(`   ⚠ ไม่พบโมเดลที่ตั้งไว้ → ใช้ ${MODEL} แทน`);
    }
  } catch (_) {}
}

resolveModel().finally(() => {
  app.listen(PORT, () => {
    console.log(`\n🌸 SummarizeMe backend`);
    console.log(`   ▶ http://localhost:${PORT}`);
    console.log(`   ▶ Ollama : ${OLLAMA_URL}  (model: ${MODEL})`);
    console.log(`   ▶ ตั้งค่า Backend URL ในหน้าเว็บเป็น  http://localhost:${PORT}\n`);
  });
});
