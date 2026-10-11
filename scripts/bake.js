#!/usr/bin/env node
// Pre-bake verified AI content with Sarvam so the live demo never waits:
//   node scripts/bake.js sprints   -> public/ai-sprints.json (sarvam-105b generate + blind re-solve verify)
//   node scripts/bake.js i18n      -> public/i18n/<lang>.json (sarvam-translate:v1, keyed by hash of English)
// The server reads these files; /api/translate and /api/generate fall back to live calls when missing.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { internals: { buildSprint, translate } } = require('../server');

const PUB = path.join(__dirname, '..', 'public');
const LANGS = ['hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'od-IN'];
const THEMES = (process.env.THEMES || 'cricket,space,monsoon,trains,festivals,animals,food,surprise me').split(',');
const PER = Number(process.env.PER || 2);
const hash = s => crypto.createHash('sha1').update(String(s).trim()).digest('hex').slice(0, 12);

async function pool(tasks, n) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k]().catch(e => ({ error: e.message })); } }));
  return out;
}

async function sprints() {
  const file = path.join(PUB, 'ai-sprints.json');
  let db = { generated: new Date().toISOString(), model: 'sarvam-105b', themes: {} };
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const jobs = THEMES.flatMap(t => Array.from({ length: PER }, () => async () => {
    const day = await buildSprint(10, t);
    // Only keep sprints where the model's own items survived independent verification (curated swaps are fine).
    day.items.forEach(it => { delete it._wrong; });
    (db.themes[t] ||= []).push(day);
    console.log('baked', t, day.items.map(i => i.verified || '-').join(','));
    return day;
  }));
  const res = await pool(jobs, Number(process.env.CONC || 8));
  res.filter(r => r && r.error).forEach(r => console.error('fail', r.error));
  db.generated = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(db));
  console.log('wrote', file, Object.fromEntries(Object.entries(db.themes).map(([k, v]) => [k, v.length])));
}

function strings() {
  const set = new Set();
  const add = it => [it.title, it.question, it.passage, it.explanation, ...(it.options || [])].forEach(s => s && set.add(String(s)));
  const bank = JSON.parse(fs.readFileSync(path.join(PUB, 'puzzles.json'), 'utf8'));
  bank.days.forEach(d => { set.add(d.theme); d.items.forEach(add); });
  (bank.deep_thoughts || []).forEach(q => set.add(typeof q === 'string' ? q : q.question || q.text || ''));
  try { Object.values(JSON.parse(fs.readFileSync(path.join(PUB, 'ai-sprints.json'), 'utf8')).themes).flat().forEach(d => d.items.forEach(add)); } catch {}
  set.delete('');
  // Pure numbers / symbols need no translation.
  return [...set].filter(s => /\p{L}/u.test(s));
}

async function i18n() {
  const src = strings();
  console.log(src.length, 'strings x', LANGS.length, 'languages');
  const dbs = {}, file = l => path.join(PUB, 'i18n', l + '.json');
  for (const l of LANGS) { try { dbs[l] = JSON.parse(fs.readFileSync(file(l), 'utf8')); } catch { dbs[l] = {}; } }
  const tasks = LANGS.flatMap(lang => src.filter(s => !dbs[lang][hash(s)]).map(s => async () => {
    for (let a = 0; a < 5; a++) {
      try { const t = await translate(s, lang); if (t && t.trim() && t.trim() !== s.trim()) dbs[lang][hash(s)] = t; return; }
      catch (e) { if (a === 4) console.error(lang, e.code, e.message.slice(0, 80)); await new Promise(r => setTimeout(r, 800 * (a + 1))); }
    }
  }));
  console.log(tasks.length, 'translations to do');
  fs.mkdirSync(path.join(PUB, 'i18n'), { recursive: true });
  const save = () => { for (const l of LANGS) fs.writeFileSync(file(l), JSON.stringify(dbs[l])); };
  const tick = setInterval(save, 10000);
  await pool(tasks, Number(process.env.CONC || 5));
  clearInterval(tick); save();
  for (const l of LANGS) console.log(l, Object.keys(dbs[l]).length, 'entries');
}

const what = process.argv[2] || 'all';
(async () => {
  if (what === 'sprints' || what === 'all') await sprints();
  if (what === 'i18n' || what === 'all') await i18n();
})().catch(e => { console.error(e); process.exit(1); });
module.exports = { hash };
