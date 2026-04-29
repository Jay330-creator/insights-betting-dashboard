import fs from 'node:fs/promises';

// Load local .env without printing secrets
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL; // e.g. https://xxxx.supabase.co
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

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

function fingerprintFromPick(p) {
  // deterministic dedupe key across reposts
  const key = [
    p.pick_date,
    p.league ?? '',
    p.bet_type,
    p.matchup,
    p.selection,
    p.line ?? '',
    p.odds_american ?? '',
    p.units ?? 1,
  ].join('|').toLowerCase();
  // cheap stable hash
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return `fp_${Math.abs(h)}`;
}

function parsePicksFromMessage(content) {
  // Minimal parser: looks for lines like "Play: X (-110)" or "X ML (-174)".
  // This will be improved iteratively after first import.
  const lines = content.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  // naive date: none in discord post; caller should fill
  const picks = [];

  // detect matchup context when present
  let matchup = null;

  for (const l of lines) {
    // capture matchup like "Game: OKC @ TOR" or "Matchup: ..."
    const m1 = l.match(/^(Game|Matchup)\s*:\s*(.+)$/i);
    if (m1) { matchup = m1[2]; continue; }

    // capture pick line variants
    // Example: "Play: Cavaliers -4 (-174)" OR "Lakers ML (-180)" OR "Under 233.5 (-110)"
    const m2 = l.match(/^(?:Play\s*:\s*)?(.+?)\s*\(([-+]?\d{2,4})\)\s*$/);
    if (m2) {
      picks.push({ selection: m2[1], odds_american: Number(m2[2]), matchup });
      continue;
    }

    // Example: "Isaiah Joe OVER 14.5 Points (-113)"
    const m3 = l.match(/^(.+?)\s*\(([-+]?\d{2,4})\)\s*$/);
    if (m3 && /over|under|ml|\+|\-|points|reb|ast|pra|spread|total/i.test(m3[1])) {
      picks.push({ selection: m3[1], odds_american: Number(m3[2]), matchup });
    }
  }

  return picks;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node import-discord-to-supabase.mjs <messages.json>');
    process.exit(1);
  }

  const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  // expected: array of {channel_id, message_id, author_id, author_username, sent_at, content}

  // 1) insert source_messages (dedupe via unique)
  const sourceRows = raw.map(m => ({
    platform: 'discord',
    channel_id: String(m.channel_id),
    message_id: String(m.message_id),
    author_id: m.author_id ? String(m.author_id) : null,
    author_username: m.author_username ?? null,
    sent_at: m.sent_at ?? null,
    content: m.content ?? '',
    raw: m,
  }));

  const insertedSources = await sbInsert('source_messages', sourceRows);

  // 2) parse picks, insert picks with fingerprint
  const pickRows = [];
  const pickSources = [];

  for (const sm of insertedSources) {
    const picks = parsePicksFromMessage(sm.content || '');
    for (const p of picks) {
      const row = {
        primary_source_message_id: sm.id,
        pick_fingerprint: 'tmp',
        pick_date: (sm.sent_at ? sm.sent_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        picked_at: sm.sent_at,
        start_time_et: null,
        start_time: null,
        league: null,
        bet_type: 'moneyline',
        matchup: p.matchup || 'Unknown',
        selection: p.selection,
        market: null,
        line: null,
        odds_american: p.odds_american,
        book: null,
        units: 1,
        confidence: null,
        label: null,
        ai_research_summary: null,
        result: 'PENDING',
        notes: null,
      };
      row.pick_fingerprint = fingerprintFromPick(row);
      pickRows.push(row);
    }
  }

  const insertedPicks = await sbInsert('picks', pickRows);

  // backfill pick_sources (primary already references, but keep explicit)
  for (const pk of insertedPicks) {
    if (pk.primary_source_message_id) {
      pickSources.push({ pick_id: pk.id, source_message_id: pk.primary_source_message_id, kind: 'post' });
    }
  }
  await sbInsert('pick_sources', pickSources);

  console.log(`Inserted source_messages=${insertedSources.length}, picks=${insertedPicks.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
