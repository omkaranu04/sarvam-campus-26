// Vercel serverless entry: /api/<name> → handlers['/api/<name>'] in server.js.
// Static files are served from public/ by Vercel itself.
const { handlers, errorBody } = require('../server');

const HITS = new Map(); // best-effort per-instance rate limit (cost guard for the Sarvam key)

module.exports = async (req, res) => {
  const route = '/api/' + req.query.name;
  if (req.method !== 'POST' || !Object.prototype.hasOwnProperty.call(handlers, route)) return res.status(404).json({ error: 'Not found' });
  // x-real-ip is set by Vercel's edge; the first XFF hop is client-controlled.
  const ip = String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',').pop() || 'anon').trim(), now = Date.now();
  if (HITS.size > 5000) for (const [k, v] of HITS) if (!v.length || now - v[v.length - 1] > 60000) HITS.delete(k);
  const hits = (HITS.get(ip) || []).filter(t => now - t < 60000);
  if (hits.length >= 120) return res.status(429).json({ error: 'Lots of puzzlers right now! Please try again in a few seconds.', code: 'rate_limited' });
  hits.push(now); HITS.set(ip, hits);
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { body = null; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Something was missing in that request.', code: 'bad_request' });
  try {
    res.status(200).json(await handlers[route](body));
  } catch (e) {
    console.error(route, 'failed:', e.code || '', e.message);
    const { status, body: out } = errorBody(e);
    res.status(status).json(out);
  }
};
