const raw: { picks: any[] } = { picks: [] };
import type { Pick, DailyCard } from './sample';

// Convert extracted pick lines from DM export into normalized demo picks.
// NOTE: This is a best-effort parser for portfolio/demo; it will be replaced by the Supabase-backed importer.

function guessLeague(line: string): Pick['league'] {
  const s = line.toLowerCase();
  if (s.includes('wild') || s.includes('avalanche') || s.includes('bruins') || s.includes('sharks')) return 'NHL';
  if (s.includes('duke') || s.includes('villanova') || s.includes("st. john") || s.includes('tennessee')) return 'NCAAB';
  return 'NBA';
}

function guessBetType(line: string): Pick['betType'] {
  const s = line.toLowerCase();
  if (s.includes('over') || s.includes('under')) return 'total';
  if (s.includes('ml')) return 'moneyline';
  if (s.includes('+') || s.includes('-')) return 'spread';
  return 'moneyline';
}

function toPick(idx: number, date: string | null, line: string, odds: number): Pick {
  const league = guessLeague(line);
  const betType = guessBetType(line);
  return {
    id: `dm_${idx}`,
    date: date ?? '2026-03-01',
    league,
    betType,
    matchup: 'From DM export (demo)',
    startTimeET: 'TBD',
    pick: line.replace(/\s*\([-+]?\d{3}\)\s*$/, ''),
    units: 1,
    confidence: 7.2,
    confidenceTier: 'unknown',
    researchSummary: 'Imported from DM preview export (demo). Full research/odds movement will come from Supabase import.',
    oddsAtPick: { book: 'FanDuel', market: 'At Pick', line, odds, ts: new Date(`${date ?? '2026-03-01'}T16:00:00Z`).toISOString() },
    result: 'PENDING',
  };
}

const dmPicks: Pick[] = (raw as any).pickLines.map((p: any, i: number) => toPick(i + 1, p.date, p.line, p.odds));

export const demoCards: DailyCard[] = dmPicks.reduce((acc: DailyCard[], p: Pick) => {
  const existing = acc.find(x => x.date === p.date);
  if (existing) existing.picks.push(p);
  else acc.push({ date: p.date, picks: [p] });
  return acc;
}, []).sort((a,b) => a.date.localeCompare(b.date));
