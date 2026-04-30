import 'dotenv/config';
import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL;
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

function guessLeague(text) {
  const s = text.toLowerCase();
  if (/(nhl|bruins|sharks|avalanche|wild)/i.test(text)) return 'NHL';
  if (/(ncaab|duke|virginia|st\.? john|utah state)/i.test(text)) return 'NCAAB';
  if (/(mlb|yankees|dodgers|mets|cubs)/i.test(text)) return 'MLB';
  return 'NBA';
}

function guessSport(league) {
  if (league === 'MLB') return 'baseball';
  if (league === 'NHL') return 'hockey';
  return 'basketball';
}

function parseOdds(line) {
  const m = line.match(/\(([-+]?\d{3})\)/);
  if (m) return Number(m[1]);
  const m2 = line.match(/\bOdds\s*:\s*([-+]?\d{3})\b/i);
  if (m2) return Number(m2[1]);
  return null;
}

function parseTimeET(block) {
  const m = block.match(/\b(\d{1,2}:\d{2})\s*(AM|PM)\s*ET\b/i);
  return m ? `${m[1]} ${m[2].toUpperCase()}` : null;
}

function parseBetTypeFromLine(selection) {
  const s = selection.toLowerCase();
  if (s.includes(' over ') || s.includes(' under ') || s.startsWith('over ') || s.startsWith('under ')) return 'total';
  if (s.includes(' ml') || s.includes('moneyline') || s.endsWith(' ml')) return 'moneyline';
  if (s.includes('pra') || s.includes('points') || s.includes('reb') || s.includes('assists') || s.includes('3s') || s.includes('made 3')) return 'player_prop';
  if (/[+-]\d+(\.\d+)?/.test(selection)) return 'spread';
  return 'moneyline';
}

function cleanSelection(line) {
  return line.replace(/\s*\(([-+]?\d{3})\)\s*$/, '').trim();
}

function extractPicksFromContent(content) {
  const picks = [];

  // Prefer lines that look like explicit picks.
  const lines = content.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  // Identify blocks (BEST STRAIGHT / LEAN / MAIN / SECONDARY)
  let current = null;
  for (const l of lines) {
    if (/\bBEST\b.*\bSTRAIGHT\b/i.test(l) || /^\*\*1\)\s*BEST/i.test(l) || /^1\)\s*BEST/i.test(l)) {
      current = { label: 'BEST' };
      continue;
    }
    if (/\bLEAN\b/i.test(l) && !/clean/i.test(l)) {
      current = { label: 'LEAN' };
      // we still keep multiple leans
    }
    if (/\bMAIN\b/i.test(l)) current = { label: 'MAIN' };
    if (/\bSECONDARY\b/i.test(l)) current = { label: 'SECONDARY' };

    const odds = parseOdds(l);
    if (odds == null) continue;

    // Avoid capturing generic lines like "Confidence: 7.6/10" etc.
    if (/confidence/i.test(l)) continue;

    const selection = cleanSelection(l.replace(/^[-•]\s*/, ''));
    if (selection.length < 4) continue;

    picks.push({
      selection,
      odds,
      label: current?.label ?? null,
    });
  }

  return picks;
}

function toRow(msg, extracted) {
  const pick_date = msg.sent_at ? msg.sent_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const league = guessLeague(msg.content);
  const sport = guessSport(league);
  const start_time_et = parseTimeET(msg.content);
  const bet_type = parseBetTypeFromLine(extracted.selection);

  return {
    pick_date,
    league,
    sport,
    game: 'Imported from DM history',
    pick_rank: extracted.label === 'BEST' || extracted.label === 'MAIN' ? 1 : extracted.label === 'SECONDARY' ? 2 : null,
    pick_name: extracted.label ?? null,
    bet_type,
    odds: extracted.odds,
    sportsbook: /fanduel/i.test(msg.content) ? 'FanDuel' : null,
    units: extracted.label === 'SECONDARY' ? 0.5 : 1.0,
    confidence: null,
    risk_level: null,
    status: 'posted',
    result: 'PENDING',
    profit_loss: null,
    reasoning: null,
    pass_triggers: null,
    source_summary: `DM message ${msg.message_id}`,
    created_at: msg.sent_at ?? null,
    graded_at: null,
  };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node import-dm-to-picks.mjs <dm_messages.json>');
    process.exit(1);
  }

  const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));

  // Normalize message shape if coming from message tool read
  const messages = raw.map(m => ({
    channel_id: m.channel_id ?? m.channelId ?? null,
    message_id: m.message_id ?? m.id,
    author_id: m.author_id ?? m.author?.id ?? null,
    author_username: m.author_username ?? m.author?.username ?? null,
    sent_at: m.sent_at ?? m.timestampUtc ?? m.timestamp ?? null,
    content: m.content ?? '',
  }));

  const rows = [];
  for (const msg of messages) {
    if (!msg.content) continue;
    const extracted = extractPicksFromContent(msg.content);
    for (const e of extracted) rows.push(toRow(msg, e));
  }

  // dedupe within this run by (pick_date, bet_type, odds, pick_name)
  const seen = new Set();
  const deduped = [];
  for (const r of rows) {
    const key = [r.pick_date, r.league, r.bet_type, r.odds, r.pick_name].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  const inserted = await sbInsert('picks', deduped);
  console.log(`Inserted picks=${inserted.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
