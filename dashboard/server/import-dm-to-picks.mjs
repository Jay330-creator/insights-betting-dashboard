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
  if (/(nhl|bruins|sharks|avalanche|wild)/i.test(text)) return 'NHL';
  if (/(ncaab|\bduke\b|\bvirginia\b|st\.? john|utah state)/i.test(text)) return 'NCAAB';
  if (/(mlb|yankees|dodgers|mets|cubs)/i.test(text)) return 'MLB';
  return 'NBA';
}

function guessSport(league) {
  if (league === 'MLB') return 'baseball';
  if (league === 'NHL') return 'hockey';
  return 'basketball';
}

function parseOdds(text) {
  // Guard: ignore range strings like "+100..-200" or "+100 to -200"
  if (/\+\s*100\s*(\.\.|to)\s*-\s*200/i.test(text)) return null;
  if (/odds\s*(filter|range)/i.test(text) && /\+\s*100/i.test(text) && /-\s*200/i.test(text)) return null;

  const m = text.match(/\(([-+]?\d{3})\)/);
  if (m) return Number(m[1]);
  const m2 = text.match(/\bOdds\s*:?\s*([-+]?\d{3})\b/i);
  if (m2) return Number(m2[1]);
  return null;
}

function parseConfidence(text) {
  const m = text.match(/confidence\s*:?\s*\*{0,2}([0-9]+(?:\.[0-9])?)\s*\/\s*10/i);
  return m ? Number(m[1]) : null;
}

function parseTimeET(text) {
  const m = text.match(/\b(\d{1,2}:\d{2})\s*(AM|PM)\s*ET\b/i);
  return m ? `${m[1]} ${m[2].toUpperCase()}` : null;
}

function parseMatchup(text) {
  // Examples: "Clippers @ Pelicans", "Miami Heat @ Charlotte Hornets", "Virginia vs Duke"
  const m = text.match(/\b([A-Za-z0-9.'\-\s\(\)]+?)\s+(@|vs\.?|VS)\s+([A-Za-z0-9.'\-\s\(\)]+)\b/);
  if (!m) return null;
  return { team: m[1].trim(), opponent: m[3].trim(), sep: m[2] };
}

function parseMarketAndPick(text) {
  // Example: "Market: Moneyline — Heat ML (-174)"
  // Example: "Market:** Total — **Under 226.5 (-114)**"
  const marketMatch = text.match(/Market\s*:?\s*(?:\*\*)?\s*([A-Za-z+\s\/]+?)\s*[\|—-]/i);
  const market = marketMatch ? marketMatch[1].trim() : null;

  // pick inside **...** or after Pick:
  const pickMatch = text.match(/\*\*([^*]+?)\s*\(([-+]?\d{3})\)\*\*/);
  if (pickMatch) {
    return { market, pick: pickMatch[1].trim(), odds: Number(pickMatch[2]) };
  }
  const pickMatch2 = text.match(/Pick\s*:?\s*([^|]+?)\s*\|\s*Odds\s*:?\s*([-+]?\d{3})/i);
  if (pickMatch2) {
    return { market, pick: pickMatch2[1].trim(), odds: Number(pickMatch2[2]) };
  }

  // fallback: any "X (-110)" in line
  const odds = parseOdds(text);
  if (!odds) return null;
  const pick = text.replace(/\(([-+]?\d{3})\)/, '').replace(/^[-•]\s*/, '').trim();
  return { market, pick, odds };
}

function parseLineFromPick(pick) {
  const m = pick.match(/(Over|Under)\s*([0-9]+(?:\.[0-9])?)/i);
  if (m) return `${m[1].toUpperCase()} ${m[2]}`;
  const m2 = pick.match(/\b([+-]\d+(?:\.[05])?)\b/);
  if (m2) return m2[1];
  return null;
}

function parsePlayerName(pick) {
  // Heuristic: "First Last OVER ..." and includes points/reb/ast/pra.
  if (!/(points|reb|rebound|assist|pra|made 3|3s)/i.test(pick)) return null;
  const m = pick.match(/^([A-Z][a-zA-Z.'\-]+\s+[A-Z][a-zA-Z.'\-]+)/);
  return m ? m[1].trim() : null;
}

function parseBetType(market, pick) {
  const s = (market || pick).toLowerCase();
  if (s.includes('moneyline') || /\bml\b/.test(s)) return 'moneyline';
  if (s.includes('total') || s.includes('over') || s.includes('under')) return 'total';
  if (s.includes('spread') || /\b[+-]\d/.test(pick)) return 'spread';
  if (/(points|reb|assist|pra|made 3|3s)/i.test(pick)) return 'player_prop';
  return 'moneyline';
}

function extractRowsFromContent(content) {
  const lines = content.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const league = guessLeague(content);
  const sport = guessSport(league);
  const start_time_et = parseTimeET(content);
  const confidence = parseConfidence(content);

  // capture last seen matchup line
  let matchup = null;
  let currentLabel = null;
  const out = [];

  for (const l0 of lines) {
    const l = l0.replace(/^•\s*/, '').trim();

    // Label tracking
    if (/\bBEST\b.*\bSTRAIGHT\b/i.test(l) || /^\*\*1\)\s*BEST/i.test(l) || /^1\)\s*BEST/i.test(l)) {
      currentLabel = 'BEST';
      continue;
    }
    if (/\bLEAN\b/i.test(l) && !/clean/i.test(l)) {
      currentLabel = 'LEAN';
    }
    if (/\bMAIN\b/i.test(l)) currentLabel = 'MAIN';
    if (/\bSECONDARY\b/i.test(l)) currentLabel = 'SECONDARY';

    // Matchup detection (often on the time line)
    const mm = parseMatchup(l);
    if (mm) matchup = mm;

    // Market + pick detection
    if (!parseOdds(l) && !/Market/i.test(l) && !/Pick/i.test(l)) continue;
    if (/confidence/i.test(l)) continue;

    const mp = parseMarketAndPick(l);
    if (!mp) continue;

    const pick = mp.pick;
    const odds = mp.odds;
    const market = mp.market;

    // Skip obvious non-picks (headers)
    if (/\bpreview\b/i.test(pick)) continue;
    if (/\bodds\s*(filter|range)\b/i.test(pick)) continue;

    const bet_type = parseBetType(market, pick);
    const line = parseLineFromPick(pick);
    const player_name = parsePlayerName(pick);

    // team/opponent
    let team = matchup?.team ?? null;
    let opponent = matchup?.opponent ?? null;

    // If pick contains "X @ Y" override
    const mm2 = parseMatchup(pick);
    if (mm2) {
      team = mm2.team;
      opponent = mm2.opponent;
    }

    const units = currentLabel === 'SECONDARY' ? 0.5 : currentLabel === 'LEAN' ? 0.5 : 1.0;
    const pick_rank = currentLabel === 'BEST' || currentLabel === 'MAIN' ? 1 : currentLabel === 'SECONDARY' ? 2 : null;

    out.push({
      pick_date: null, // filled by caller
      league,
      sport,
      game: matchup ? `${matchup.team} ${matchup.sep} ${matchup.opponent}` : 'Unknown',
      pick_rank,
      pick_name: currentLabel,
      bet_type,
      odds,
      sportsbook: /fanduel/i.test(content) ? 'FanDuel' : null,
      units,
      confidence,
      risk_level: null,
      status: 'posted',
      result: 'PENDING',
      profit_loss: null,
      reasoning: null,
      pass_triggers: null,
      source_summary: null, // filled by caller
      created_at: null, // filled by caller
      graded_at: null,

      // extra fields (require migration):
      player_name,
      team,
      opponent,
      market,
      line,
      pick,
      source: null,
    });
  }

  return out;
}

function validateRow(r) {
  // Required for usable analytics
  const missing = [];
  if (!r.pick_date) missing.push('pick_date');
  if (!r.sport) missing.push('sport');
  if (!r.bet_type) missing.push('bet_type');
  if (r.odds == null) missing.push('odds');
  if (!r.pick) missing.push('pick');
  // require either team/opponent or player_name
  if (!(r.player_name || (r.team && r.opponent))) missing.push('team/opponent or player_name');
  return { ok: missing.length === 0, missing };
}

async function logSkipped(obj) {
  const path = new URL('./skipped_rows.jsonl', import.meta.url);
  await fs.appendFile(path, JSON.stringify(obj) + '\n');
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node import-dm-to-picks.mjs <dm_messages.json>');
    process.exit(1);
  }

  const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));

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
    const extractedRows = extractRowsFromContent(msg.content);
    for (const r of extractedRows) {
      r.pick_date = msg.sent_at ? msg.sent_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
      r.created_at = msg.sent_at ?? null;
      r.source_summary = `DM message ${msg.message_id}`;
      r.source = msg.message_id;
      rows.push(r);
    }
  }

  // dedupe within this run by a fingerprint that includes the pick itself
  const seen = new Set();
  const deduped = [];
  for (const r of rows) {
    const key = [r.pick_date, r.league, r.bet_type, r.pick, r.line ?? '', r.odds, r.units].join('|').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const v = validateRow(r);
    if (!v.ok) {
      await logSkipped({ reason: 'missing_required', missing: v.missing, row: r });
      continue;
    }

    deduped.push(r);
  }

  const inserted = await sbInsert('picks', deduped);
  console.log(`Inserted picks=${inserted.length}, skipped=${rows.length - deduped.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
