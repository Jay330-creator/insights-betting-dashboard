import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

function americanToDecimal(american) {
  if (american === 0 || american === null || american === undefined) return null;
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

async function sbSelect(path) {
  const res = await fetch(`${REST}/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

async function sbPatch(table, matchQuery, patch) {
  const res = await fetch(`${REST}/${table}?${matchQuery}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase patch failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : [];
}

async function sbUpsertDailySummary(row) {
  const res = await fetch(`${REST}/daily_summary`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase upsert daily_summary failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

function parseTeamsFromGame(game) {
  if (!game) return null;
  const m = game.match(/^(.+?)\s+(@|vs\.?|VS)\s+(.+)$/);
  if (!m) return null;
  return { a: m[1].trim(), sep: m[2], b: m[3].trim() };
}

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 \-\.']/g, '')
    .trim();
}

async function fetchFinalScoreBestEffort(pick) {
  // Best-effort web fetch: search query "TEAM vs TEAM final score YYYY-MM-DD".
  // We avoid claiming certainty when we can't parse.
  const team = pick.team || (parseTeamsFromGame(pick.game)?.a ?? null);
  const opp = pick.opponent || (parseTeamsFromGame(pick.game)?.b ?? null);
  if (!team || !opp) return null;

  const q = `${team} ${opp} final score ${pick.pick_date}`;
  const res = await fetch(`https://r.jina.ai/http://r.jina.ai/https://duckduckgo.com/?q=${encodeURIComponent(q)}`);
  // Not reliable: If fetch fails or content doesn't include an obvious score, return null.
  if (!res.ok) return null;
  const txt = await res.text();
  // Look for patterns like "123-110" near team names.
  const scoreMatch = txt.match(/\b(\d{2,3})\s*[-–]\s*(\d{2,3})\b/);
  if (!scoreMatch) return null;
  return { scoreA: Number(scoreMatch[1]), scoreB: Number(scoreMatch[2]), display: `${team} ${scoreMatch[1]} - ${scoreMatch[2]} ${opp}` };
}

function gradePick(pick, finalScore) {
  // Minimal grading logic:
  // - moneyline: if pick text contains a team name and that team has higher score => W
  // - totals/spreads require structured line which we may not have; return null if insufficient.
  const bt = String(pick.bet_type || '').toLowerCase();
  const selection = String(pick.pick || '').toLowerCase();

  if (bt === 'moneyline') {
    const team = normalizeName(pick.team || '');
    const opp = normalizeName(pick.opponent || '');
    const sel = normalizeName(selection);

    // Determine which side selection is on.
    // If selection includes team name -> pick team; else if includes opp name -> pick opp.
    let picked = null;
    if (team && sel.includes(team)) picked = 'team';
    else if (opp && sel.includes(opp)) picked = 'opp';
    else {
      // fallback: 'ML' lines like "Heat ML" might include nickname not full name; can't grade.
      return null;
    }

    const teamWon = finalScore.scoreA > finalScore.scoreB;
    // assume scoreA corresponds to team, scoreB to opp
    const pickedWon = (picked === 'team') ? teamWon : !teamWon;
    return pickedWon ? 'W' : 'L';
  }

  // Not enough structure yet
  return null;
}

function calcProfitLossUnits(pick, result) {
  const odds = Number(pick.odds);
  const units = Number(pick.units ?? 1);
  if (!Number.isFinite(odds) || !Number.isFinite(units)) return null;
  if (result === 'W') {
    const dec = americanToDecimal(odds);
    if (!dec) return null;
    return +(units * (dec - 1)).toFixed(4);
  }
  if (result === 'L') return +(-units).toFixed(4);
  if (result === 'P' || result === 'VOID') return 0;
  return null;
}

async function main() {
  const pending = await sbSelect(`picks?select=id,pick_date,league,sport,game,team,opponent,bet_type,odds,units,pick,result,status&result=eq.PENDING&limit=2000`);
  const nowIso = new Date().toISOString();

  let graded = 0;
  let stillPending = 0;

  // Grade picks best-effort
  for (const p of pending) {
    // Only attempt grading if game + team/opponent exist
    const finalScore = await fetchFinalScoreBestEffort(p);
    if (!finalScore) {
      stillPending++;
      continue;
    }

    const r = gradePick(p, finalScore);
    if (!r) {
      stillPending++;
      continue;
    }

    const pl = calcProfitLossUnits(p, r);

    await sbPatch('picks', `id=eq.${encodeURIComponent(p.id)}`, {
      result: r,
      status: 'graded',
      profit_loss: pl,
      final_score: finalScore.display,
      graded_at: nowIso,
    });

    graded++;
  }

  // Daily summary for yesterday (ET) — simplified: use pick_date grouping.
  // We compute summary for any date that has graded rows today.
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  // We'll recompute for last 3 days to be safe.
  const dates = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  for (const date of dates) {
    const rows = await sbSelect(`picks?select=result,profit_loss,units&pick_date=eq.${date}&limit=5000`);
    if (!rows.length) continue;
    let wins=0,losses=0,pushes=0,voids=0;
    let dailyPL=0;
    let bets=0;
    for (const r of rows) {
      if (r.result === 'W') wins++;
      else if (r.result === 'L') losses++;
      else if (r.result === 'P') pushes++;
      else if (r.result === 'VOID') voids++;
      if (r.result !== 'PENDING') bets++;
      if (typeof r.profit_loss === 'number') dailyPL += r.profit_loss;
    }

    // MTD: sum from first of month
    const monthStart = `${date.slice(0,7)}-01`;
    const mtdRows = await sbSelect(`picks?select=result,profit_loss&pick_date=gte.${monthStart}&pick_date=lte.${date}&limit=10000`);
    let mw=0,ml=0,mp=0,mv=0,mUnits=0;
    for (const r of mtdRows) {
      if (r.result === 'W') mw++;
      else if (r.result === 'L') ml++;
      else if (r.result === 'P') mp++;
      else if (r.result === 'VOID') mv++;
      if (typeof r.profit_loss === 'number') mUnits += r.profit_loss;
    }

    await sbUpsertDailySummary({
      summary_date: date,
      bets_posted: rows.length,
      wins,
      losses,
      pushes,
      voids,
      daily_profit_loss: +dailyPL.toFixed(4),
      mtd_record: `${mw}-${ml}-${mp}${mv?`-${mv}`:''}`,
      mtd_units: +mUnits.toFixed(4),
      api_cost: null,
      notes: null,
    });
  }

  console.log(`graded=${graded} still_pending=${stillPending}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
