// Vercel serverless function: stores/loads a planner workspace as a JSON blob.
//
// Storage: Vercel KV (Upstash Redis). When you add a KV store to the project in
// the Vercel dashboard, Vercel injects KV_REST_API_URL and KV_REST_API_TOKEN.
// We call the Upstash REST API directly (no npm dependency needed).
//
// Access model: PER-PASSCODE PRIVATE WORKSPACES.
// The client sends `Authorization: Bearer <passcode>`. The storage key is
// derived from a hash of that passcode, so each distinct passcode is its own
// isolated workspace — you can only read/write a workspace if you know its
// passcode. There is no shared master secret; the passcode IS the credential.
// (SYNC_SECRET is no longer used.)

import { createHash } from 'crypto';

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

function keyForPasscode(passcode) {
  const hex = createHash('sha256').update('planner-passcode:' + passcode).digest('hex');
  return 'planner:ws:' + hex;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = req.headers['authorization'] || '';
  const passcode = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  // A passcode is the only thing protecting a workspace, so require a decent length.
  if (passcode.length < 6) return res.status(401).json({ error: 'passcode required (min 6 characters)' });

  const key = keyForPasscode(passcode);

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
