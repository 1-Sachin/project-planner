// Vercel serverless function: stores/loads the planner workspace as a JSON blob.
//
// Storage: Vercel KV (Upstash Redis). When you add a KV store to the project in
// the Vercel dashboard, Vercel injects KV_REST_API_URL and KV_REST_API_TOKEN.
// We call the Upstash REST API directly (no npm dependency needed).
//
// Auth: set a SYNC_SECRET environment variable in Vercel. The client must send
// `Authorization: Bearer <SYNC_SECRET>`. Without the secret set, the endpoint
// refuses to run (so your data is never wide open by accident).

async function kv(command) {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) throw new Error('KV not configured');
  const res = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error('KV request failed: ' + res.status);
  return res.json(); // { result: ... }
}

export default async function handler(req, res) {
  // CORS (harmless for same-origin; lets you test from elsewhere if needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const secret = process.env.SYNC_SECRET;
  if (!secret) return res.status(500).json({ error: 'SYNC_SECRET not configured on the server' });
  const auth = req.headers['authorization'] || '';
  if (auth !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorized' });

  const id = (req.query && req.query.id) ? String(req.query.id) : 'default';
  const key = 'planner:workspace:' + id.replace(/[^\w-]/g, '');

  try {
    if (req.method === 'GET') {
      const out = await kv(['GET', key]);
      const data = out.result ? JSON.parse(out.result) : null;
      return res.status(200).json({ data });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
      if (!body || typeof body !== 'object') return res.status(400).json({ error: 'invalid body' });
      await kv(['SET', key, JSON.stringify(body)]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
