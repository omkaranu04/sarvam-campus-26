// Vercel serverless entry: /api/<name> → handlers['/api/<name>'] in server.js.
// Static files are served from public/ by Vercel itself.
const { handlers } = require('../server');

const HITS = new Map(); // best-effort per-instance rate limit (cost guard for the Sarvam key)

module.exports = async (req, res) => {
  const route = '/api/' + req.query.name;
  if (req.method !== 'POST' || !handlers[route]) return res.status(404).json({ error: 'Not found' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'anon', now = Date.now();
  const hits = (HITS.get(ip) || []).filter(t => now - t < 60000);
  if (hits.length >= 120) return res.status(429).json({ error: 'Too many requests, slow down a little' });
  hits.push(now); HITS.set(ip, hits);
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    res.status(200).json(await handlers[route](body));
  } catch (e) {
    console.error(route, 'failed:', e.message);
    res.status(502).json({ error: 'AI service unavailable right now' });
  }
};
