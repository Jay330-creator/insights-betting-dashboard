import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
const QUEUE_PATH = process.env.PICKS_QUEUE_PATH || '/Users/Sean/.openclaw/workspace/bets/picks_to_sync.jsonl';
const STATE_PATH = process.env.PICKS_SYNC_STATE_PATH || '/Users/Sean/.openclaw/workspace/bets/picks_to_sync.state.json';

async function sbSelect(url) {
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

async function sbInsert(table, rows) {
  if (!rows.length) return [];
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase insert ${table} failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch {
    return { syncedSources: {} };
  }
}

async function saveState(state) {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

function ensureGame(row) {
  if (row.game) return row;
  if (row.team && row.opponent) {
    row.game = `${row.team} vs ${row.opponent}`;
    return row;
  }
  if (row.matchup) {
    row.game = row.matchup;
    return row;
  }
  row.game = 'unknown';
  return row;
}

function normalizeGenerationFields(row) {
  // Stage 2 cost attribution fields. Missing is OK.
  if (row.generation_job_id !== undefined && row.generation_job_id !== null && row.generation_job_id !== '') {
    row.generation_job_id = String(row.generation_job_id);
  }
  if (row.generation_run_at_ms !== undefined && row.generation_run_at_ms !== null && row.generation_run_at_ms !== '') {
    row.generation_run_at_ms = Number(row.generation_run_at_ms);
  }
  return row;
}

function validate(row) {
  const missing = [];
  for (const k of ['pick_date', 'sport', 'bet_type', 'odds', 'pick', 'created_at', 'game']) {
    if (row[k] === undefined || row[k] === null || row[k] === '') missing.push(k);
  }
  if (!(row.player_name || (row.team && row.opponent))) missing.push('team+opponent or player_name');
  return { ok: missing.length === 0, missing };
}

async function main() {
  const state = await loadState();
  const raw = await fs.readFile(QUEUE_PATH, 'utf8');
  const items = parseJsonl(raw);

  const toInsert = [];
  let skipped = 0;
  let already = 0;

  for (const it of items) {
    ensureGame(it);
    normalizeGenerationFields(it);
    const source = it.source || it.source_summary || null;
    if (!source) {
      skipped++;
      continue;
    }
    if (state.syncedSources[source]) {
      already++;
      continue;
    }

    const v = validate(it);
    if (!v.ok) {
      skipped++;
      continue;
    }

    // Ensure not already in DB by source
    const existing = await sbSelect(`${REST}/picks?select=id&source=eq.${encodeURIComponent(source)}&limit=1`);
    if (existing.length) {
      state.syncedSources[source] = true;
      already++;
      continue;
    }

    // Pass through any extra fields on the queue rows (including generation_job_id, generation_run_at_ms)
    // as long as the columns exist in Supabase.
    toInsert.push(it);
  }

  const inserted = await sbInsert('picks', toInsert);
  for (const row of inserted) {
    if (row.source) state.syncedSources[row.source] = true;
  }
  await saveState(state);

  console.log(`sync: inserted=${inserted.length} already=${already} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
