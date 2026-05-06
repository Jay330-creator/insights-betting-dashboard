const http = require('node:http');
const { URL } = require('node:url');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const PORT = Number(process.env.PORT || 8787);

async function handlePicks(res) {
  const rest = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
  const qs = new URLSearchParams({
    select: '*',
    order: 'pick_date.desc',
    limit: String(process.env.PICKS_LIMIT || 5000),
  });

  const r = await fetch(`${rest}/picks?${qs.toString()}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  const text = await r.text();
  if (!r.ok) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'supabase_fetch_failed', status: r.status, body: text }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

async function handlePickCosts(res) {
  const rest = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
  const qs = new URLSearchParams({
    select: 'pick_id,cost_usd',
    cost_kind: 'eq.generation',
    limit: String(process.env.PICK_COSTS_LIMIT || 10000),
  });

  const r = await fetch(`${rest}/pick_costs?${qs.toString()}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  const text = await r.text();
  if (!r.ok) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'supabase_fetch_failed', status: r.status, body: text }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && u.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET' && u.pathname === '/api/picks') {
      await handlePicks(res);
      return;
    }

    if (req.method === 'GET' && u.pathname === '/api/pick_costs') {
      await handlePickCosts(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'not_found' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'server_error', message: err?.message || String(err) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`dashboard server listening on http://127.0.0.1:${PORT}`);
});
