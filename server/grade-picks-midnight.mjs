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
  // Change the URL to include the conflict target
  const url = `${REST}/daily_summary?on_conflict=summary_date`;
  const res = await fetch(url, {
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
  const league = String(pick.league || '').trim().toUpperCase();
  const team = pick.team || (parseTeamsFromGame(pick.game)?.a ?? null);
  const opp = pick.opponent || (parseTeamsFromGame(pick.game)?.b ?? null);
  const date = String(pick.pick_date || '').trim();

  if (!league || !team || !opp || !date) return null;

  const leaguePathByKey = {
    MLB: 'baseball/mlb',
    NBA: 'basketball/nba',
    NHL: 'hockey/nhl',
    NFL: 'football/nfl',
  };
  const leaguePath = leaguePathByKey[league];
  if (!leaguePath) {
    console.warn(`espn-fetch: unsupported_league league=${league}`);
    return null;
  }

  const yyyymmdd = date.replace(/-/g, '');
  if (!/^\d{8}$/.test(yyyymmdd)) {
    console.warn(`espn-fetch: bad_pick_date league=${league} pick_date=${JSON.stringify(date)}`);
    return null;
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/${leaguePath}/scoreboard?dates=${yyyymmdd}`;

  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log('espn-fetch:', { league, date, url, matched: false, status: `http_${res.status}` });
      return null;
    }
    data = await res.json();
  } catch (e) {
    console.log('espn-fetch:', { league, date, url, matched: false, status: 'fetch_error' });
    return null;
  }

  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const subMatch = (a, b) => {
    const A = norm(a);
    const B = norm(b);
    if (!A || !B) return false;
    return A.includes(B) || B.includes(A);
  };

  const events = Array.isArray(data?.events) ? data.events : [];
  for (const ev of events) {
    const comp = (ev?.competitions && ev.competitions[0]) || null;
    const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
    if (!comp || competitors.length < 2) continue;

    const home = competitors.find((c) => c?.homeAway === 'home');
    const away = competitors.find((c) => c?.homeAway === 'away');
    if (!home || !away) continue;

    const homeName = home?.team?.displayName;
    const awayName = away?.team?.displayName;

    // Match event by team/opponent (substring both ways, case-insensitive)
    const eventMatches =
      (subMatch(team, homeName) && subMatch(opp, awayName)) || (subMatch(team, awayName) && subMatch(opp, homeName));
    if (!eventMatches) continue;

    const status = comp?.status?.type;
    const completed = Boolean(status?.completed);
    const statusText = status?.description || status?.detail || status?.state || null;

    console.log('espn-fetch:', { league, date, url, matched: true, status: statusText });

    if (!completed) return null;

    const teamCompetitor = subMatch(team, homeName) ? home : away;
    const oppCompetitor = teamCompetitor === home ? away : home;

    const scoreA = Number(teamCompetitor?.score);
    const scoreB = Number(oppCompetitor?.score);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return null;

    const homeScore = Number(home?.score);
    const awayScore = Number(away?.score);

    return {
      scoreA,
      scoreB,
      display: `${team} ${scoreA} - ${scoreB} ${opp}`,
      homeTeam: homeName,
      awayTeam: awayName,
      homeScore: Number.isFinite(homeScore) ? homeScore : home?.score,
      awayScore: Number.isFinite(awayScore) ? awayScore : away?.score,
    };
  }

  console.log('espn-fetch:', { league, date, url, matched: false, status: 'no_match' });
  return null;
}

function gradePick(pick, finalScore) {
  // finalScore.scoreA = score for pick.team
  // finalScore.scoreB = score for pick.opponent
  const scoreA = Number(finalScore?.scoreA);
  const scoreB = Number(finalScore?.scoreB);
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return null;

  const market = String(pick.market || '').toLowerCase().trim();
  const betType = String(pick.bet_type || '').toLowerCase().trim();

  // Helper: parse numeric line
  const parseLine = () => {
    const raw = pick.line;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  // Helper: remove odds parenthetical like "(-114)" so we can parse +8.5 safely
  const pickTextNoParens = String(pick.pick || '').replace(/\([^)]*\)/g, '').trim();

  // Helper: parse signed spread line from pick text (e.g. "+8.5", "-3.5")
  const parseSignedFromPickText = () => {
    const m = pickTextNoParens.match(/([+-]\d+(?:\.\d+)?)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };


  // 1) Moneyline
  const isMoneyline =
    betType === 'moneyline' || market === 'moneyline' || String(pick.line || '').toUpperCase() === 'ML';

  if (isMoneyline) {
    if (scoreA > scoreB) return 'W';
    if (scoreA < scoreB) return 'L';
    return 'P';
  }

  // 2) Spread
  const isSpread = market.includes('spread');
  if (isSpread) {
    // Prefer signed number from pick text (avoids ambiguity when DB stores "8.5" without +)
    const signed = parseSignedFromPickText();
    const base = parseLine();
    const line = signed ?? base;
    if (!Number.isFinite(line)) return null;

    const adjusted = scoreA + line;
    if (adjusted > scoreB) return 'W';
    if (adjusted < scoreB) return 'L';
    return 'P';
  }

  // 3) Total (Over/Under)
  const isTotal = market.includes('total');
  if (isTotal) {
    const line = parseLine();
    if (!Number.isFinite(line)) return null;

    const t = String(pick.pick || '').toLowerCase();
    const isUnder = t.includes('under');
    const isOver = t.includes('over');
    if (!isUnder && !isOver) return null;

    const total = scoreA + scoreB;
    if (total === line) return 'P';
    if (isUnder) return total < line ? 'W' : 'L';
    if (isOver) return total > line ? 'W' : 'L';
  }

  // 4) Player props / everything else: skip for now
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
  const pending = await sbSelect(
    `picks?select=id,source,pick_date,league,sport,game,team,opponent,bet_type,market,line,odds,units,pick,result,status&result=eq.PENDING&limit=2000`
  );
  const nowIso = new Date().toISOString();

  let graded = 0;
  let stillPending = 0;

  // Grade picks best-effort
  for (const p of pending) {
    console.log('grade-attempt:', {
      id: p.id,
      source: p.source,
      pick: p.pick,
      team: p.team,
      opponent: p.opponent,
      pick_date: p.pick_date,
    });

    // Only attempt grading if game + team/opponent exist
    const finalScore = await fetchFinalScoreBestEffort(p);
    console.log('score-fetch:', { id: p.id, finalScore });
    if (!finalScore) {
      console.log('skipped:', { id: p.id, reason: 'no_score' });
      stillPending++;
      continue;
    }

    const r = gradePick(p, finalScore);
    console.log('grade-result:', { id: p.id, result: r });
    if (!r) {
      console.log('skipped:', { id: p.id, reason: 'grade_returned_null' });
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
