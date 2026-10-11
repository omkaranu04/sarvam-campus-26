// Mind Sprint — zero-dependency Node server that proxies Sarvam AI.
// The API key stays server-side (read from SARVAM_API_KEY or .env).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = process.env.PORT || 3000;
const SARVAM = process.env.SARVAM_API_BASE_URL || 'https://api.sarvam.ai';

function loadKey() {
  if (process.env.SARVAM_API_KEY) return process.env.SARVAM_API_KEY;
  try {
    const line = fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
      .split('\n').find(l => l.startsWith('SARVAM_API_KEY='));
    return line ? line.slice('SARVAM_API_KEY='.length).trim() : '';
  } catch { return ''; }
}
const KEY = loadKey();
if (!KEY) console.warn('⚠  SARVAM_API_KEY not set — AI features will fail, offline puzzle bank still works.');

async function sarvam(endpoint, body) {
  const res = await fetch(SARVAM + endpoint, {
    method: 'POST',
    headers: { 'api-subscription-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Sarvam ${endpoint} HTTP ${res.status}`);
  return data;
}

// reasoning_effort: null disables hidden reasoning (fast, short replies);
// 'low' is used where correctness matters more than latency (puzzle generation).
async function chat(system, user, maxTokens = 2000, effort = null) {
  const call = e => sarvam('/v1/chat/completions', {
    model: 'sarvam-105b',
    reasoning_effort: e,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  });
  let text = ((await call(effort)).choices?.[0]?.message?.content || '').trim();
  if (!text && effort) text = ((await call(null)).choices?.[0]?.message?.content || '').trim();
  return text;
}

function extractJSON(text) {
  const start = text.search(/[\[{]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start < 0 || end < start) throw new Error('Model did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

async function translate(text, lang) {
  if (!text || lang === 'en-IN') return text;
  const data = await sarvam('/translate', {
    input: text.slice(0, 1900),
    source_language_code: 'en-IN',
    target_language_code: lang,
    model: 'sarvam-translate:v1',
  });
  return data.translated_text;
}

const SPEAKERS = new Set(['priya','neha','ritu','pooja','simran','kavya','ishita','shreya','roopa','tanya','aditya','rahul','rohan','amit','dev','varun','kabir','anand','tarun']);
async function tts(text, lang, speaker = 'priya') {
  if (!SPEAKERS.has(speaker)) speaker = 'priya';
  const data = await sarvam('/text-to-speech', {
    text: text.slice(0, 2400),
    target_language_code: lang,
    model: 'bulbul:v3',
    speaker,
  });
  return data.audios?.[0];
}

// ---------- API handlers ----------
const handlers = {
  // Generate a fresh daily sprint (4 auto-gradable items) with sarvam-105b.
  async '/api/generate'({ age = 10, theme = 'surprise me' }) {
    const sys = 'You write daily brain-training puzzles for Indian kids. Output ONLY valid JSON, no prose. Every answer must be correct and unambiguous, and exactly one option is right. The logic item must need genuine multi-step reasoning (number/letter sequence, deduction, odd-one-out, or a mini logic grid), never common-knowledge trivia. The riddle must be a real lateral-thinking riddle with a satisfying "aha". India-flavoured contexts welcome (cricket, trains, mangoes, rupees, ISRO, monsoon).';
    const user = `Create a daily sprint for a ${age}-year-old. Theme: ${theme}.
Return JSON: {"theme":string,"items":[
 {"type":"fast_math","title":string,"question":string,"answer":"<number as string>","explanation":string,"points":10},
 {"type":"logic","title":string,"question":string,"options":[4 strings],"answer":"<exact option>","explanation":string,"points":10},
 {"type":"riddle","title":string,"question":string,"options":[4 strings],"answer":"<exact option>","explanation":string,"points":10},
 {"type":"curiosity","title":string,"passage":"2-3 sentence fun science fact","question":string,"options":[4 strings],"answer":"<exact option>","explanation":string,"points":10}]}`;
    const day = extractJSON(await chat(sys, user, 8000, 'low'));
    if (!Array.isArray(day.items) || day.items.length < 4) throw new Error('Incomplete sprint from model');
    // Auto-grading guard: never ship an item the grader cannot mark correctly.
    for (const it of day.items) {
      if (Array.isArray(it.options)) {
        it.options = it.options.map(String);
        const hit = it.options.find(o => o.trim().toLowerCase() === String(it.answer).trim().toLowerCase());
        if (!hit || new Set(it.options.map(o => o.trim().toLowerCase())).size !== it.options.length) throw new Error(`Generated ${it.type} item failed answer check`);
        it.answer = hit;
      } else if (it.type === 'fast_math' && !/^-?\d+(\.\d+)?$/.test(String(it.answer).trim())) {
        throw new Error('Generated fast_math answer is not a number');
      }
    }
    return { day };
  },

  // Translate a batch of strings in one go (keeps request count low).
  async '/api/translate'({ texts = [], lang = 'en-IN' }) {
    texts = (Array.isArray(texts) ? texts : []).slice(0, 40).map(String);
    const out = await Promise.all(texts.map(t => translate(t, lang).catch(() => t)));
    return { texts: out };
  },

  async '/api/tts'({ text, lang = 'en-IN', speaker }) {
    return { audio: await tts(text, lang, speaker) };
  },

  // Socratic hint: nudges thinking, never reveals the answer.
  async '/api/hint'({ question, options, answer, wrong, lang = 'en-IN', level = 1 }) {
    const sys = 'You are a warm Socratic coach for kids aged 8-14. Give ONE short hint (max 2 sentences) that nudges how to think. NEVER state, spell out, or eliminate down to the correct answer. The hint must be mathematically consistent with the correct answer and must not steer toward the kid\'s wrong attempt. Do not introduce new numbers that are not in the puzzle. No preamble.';
    const user = `Puzzle: ${question}\n${options ? 'Options: ' + options.join(' | ') : ''}\nCorrect answer (secret, do not reveal): ${answer}\nKid's wrong attempt: ${wrong || 'none yet'}\nHint level ${level} of 3 (higher = more specific, still never the answer).`;
    let hint = await chat(sys, user, 1200);
    const W = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
    const T = { 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'hundred' };
    const a = String(answer || '').trim().toLowerCase(), n = Number(a);
    const leaks = [a, ...(Number.isInteger(n) ? [W[n], T[n], n > 20 && n < 100 && T[n - n % 10]].filter(Boolean) : [])];
    if (answer && leaks.some(x => x && (/^\d+$/.test(x) ? new RegExp('(^|\\D)' + x + '(\\D|$)').test(hint) : hint.toLowerCase().includes(x)))) {
      hint = 'Try breaking the puzzle into smaller steps — what do you know for sure first?';
    }
    return { hint: await translate(hint, lang) };
  },

  // Weekly parent Session Digest: engagement facts only (DPDP-safe), in the parent's language + voice note.
  async '/api/digest'({ child, stats = {}, lang = 'hi-IN', speaker = 'priya' }) {
    child = String(child || '').trim().slice(0, 40) || 'your child';
    stats = stats && typeof stats === 'object' ? stats : {};
    if (!Object.values(stats).some(v => typeof v === 'number' && v > 0)) {
      const en = `Mind Sprint this week: ${child} has not completed a sprint yet. A 10-minute puzzle sprint together tonight is a great way to start! Dinner question: if you could invent one new rule for cricket, what would it be?`;
      const text = await translate(en, lang);
      return { en, text, audio: await tts(text, lang, speaker).catch(() => null) };
    }
    const sys = 'You write a short WhatsApp weekly "Session Digest" for an Indian parent about their child\'s brain-puzzle practice. Warm, concise (60-90 words), 1-2 emojis max. Report ONLY participation facts given (days completed, puzzles solved, points, badges, a highlight). Use ONLY the facts given: never invent skills, puzzle types, or achievements that are not in the facts. Do NOT claim any cognitive/IQ/percentage improvement, do NOT compare with other children, do NOT upsell. Refer to the child by name and avoid gendered pronouns (he/she/him/her). End with one fun question the parent can ask the child at dinner.';
    const user = `Child: ${child}\nFacts: ${JSON.stringify(stats)}`;
    let en = await chat(sys, user, 1500);
    // Facts-only guard: every number the model writes must come from the stats we were given.
    const allowed = new Set((JSON.stringify(stats).match(/\d+/g) || []));
    if ((en.match(/\d+/g) || []).some(n => !allowed.has(n))) {
      const f = Object.entries(stats).filter(([, v]) => ['number', 'string'].includes(typeof v)).map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${v}`).join(', ');
      en = `Mind Sprint weekly digest for ${child} — ${f}. Lovely effort! Dinner question: what was the trickiest puzzle this week, and how did you crack it?`;
    }
    const text = await translate(en, lang);
    const audio = await tts(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿*_#]/gu, ''), lang, speaker).catch(() => null);
    return { en, text, audio };
  },

  // Deep Thought: kid speaks a reflection (Saarika STT) — acknowledged warmly, never scored.
  async '/api/reflect'({ prompt, audio, text, lang = 'en-IN' }) {
    let transcript = text || '';
    if (audio) {
      const buf = Buffer.from(audio, 'base64');
      const form = new FormData();
      form.append('file', new Blob([buf], { type: 'audio/webm' }), 'reflection.webm');
      form.append('model', 'saarika:v2.5');
      form.append('language_code', 'unknown');
      const res = await fetch(SARVAM + '/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': KEY }, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'STT failed');
      transcript = data.transcript || '';
    }
    const sys = 'You are a curious, kind thinking-partner for a child. The child shared a reflection on an open philosophical question. Reply in 2-3 short sentences: appreciate one specific idea they had, then ask one gentle follow-up question that deepens it. Never grade, score, or say right/wrong.';
    const reply = await chat(sys, `Question: ${prompt}\nChild said: ${transcript}`, 1200);
    return { transcript, reply: await translate(reply, lang) };
  },
};

// ---------- HTTP plumbing ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const HITS = {};
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && handlers[url.pathname]) {
    // Per-IP rate limit (cost guard for the Sarvam key): 120 AI calls/minute.
    const ip = req.socket.remoteAddress, now = Date.now();
    const b = (HITS[ip] = (HITS[ip] || []).filter(t => now - t < 60000));
    if (b.length >= 120) return res.writeHead(429, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Too many requests, slow down a little' }));
    b.push(now);
    const limit = url.pathname === '/api/reflect' ? 8e6 : 1e5;
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > limit) req.destroy(); });
    req.on('end', async () => {
      const t0 = Date.now();
      try {
        const out = await handlers[url.pathname](raw ? JSON.parse(raw) : {});
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(out));
        console.log(`${url.pathname} ok ${Date.now() - t0}ms`);
      } catch (e) {
        console.error(`${url.pathname} failed:`, e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'AI service unavailable right now' }));
      }
    });
    return;
  }
  const file = path.join(PUBLIC, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(buf);
  });
}).listen(PORT, () => console.log(`🧠 Mind Sprint running → http://localhost:${PORT}`));
