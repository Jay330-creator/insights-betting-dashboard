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
const QUEUE_PATH = process.env.RESEARCH_QUEUE_PATH || '/Users/Sean/.openclaw/workspace/bets/research_logs_to_sync.jsonl';
const STATE_PATH = process.env.RESEARCH_SYNC_STATE_PATH || '/Users/Sean/.openclaw/workspace/bets/research_logs_to_sync.state.json';

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

function validate(row) {
  const missing = [];
  if (!row.pick_source) missing.push('pick_source');
  if (!row.content && !row.final_research_summary) missing.push('content/final_research_summary');
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
    const source = it.pick_source;
    if (state.syncedSources[source]) {
      already++;
      continue;
    }

    const v = validate(it);
    if (!v.ok) {
      skipped++;
      continue;
    }

    // Resolve pick_id from picks table by source
    const found = await sbSelect(`${REST}/picks?select=id&source=eq.${encodeURIComponent(source)}&limit=1`);
    if (!found.length) {
      // pick not inserted yet
      skipped++;
      continue;
    }

    const pick_id = found[0].id;

    // Ensure we haven't already inserted a research log for this pick+source
    const existing = await sbSelect(`${REST}/research_logs?select=id&pick_id=eq.${encodeURIComponent(pick_id)}&limit=1`);
    if (existing.length) {
      state.syncedSources[source] = true;
      already++;
      continue;
    }

    toInsert.push({
      pick_id,
      research_date: it.research_date || null,
      sources_checked: it.sources_checked || null,
      linemate_data_summary: it.linemate_data_summary || null,
      injury_notes: it.injury_notes || null,
      line_movement: it.line_movement || null,
      matchup_notes: it.matchup_notes || null,
      player_form: it.player_form || null,
      team_form: it.team_form || null,
      red_flags: it.red_flags || null,
      final_research_summary: it.final_research_summary || it.content || null,
      created_at: it.created_at || null,
    });
  }

  const inserted = await sbInsert('research_logs', toInsert);
  for (const it of items) {
    if (it.pick_source) state.syncedSources[it.pick_source] = true;
  }
  await saveState(state);

  console.log(`research sync: inserted=${inserted.length} already=${already} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
