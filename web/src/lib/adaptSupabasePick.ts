import type { Pick } from '../data/sample';

type SupabasePickRow = Record<string, any>;

type AllowedResult = Pick['result'];

type ConfidenceTier = Pick['confidenceTier'];

function normalizeTier(input: unknown): ConfidenceTier {
  const s = String(input ?? '').trim().toLowerCase();
  if (s === 'best' || s === 'secondary') return s as ConfidenceTier;
  return 'unknown';
}

function parseConfidenceTier(row: SupabasePickRow): ConfidenceTier {
  // Prefer explicit rank/name fields if present.
  if (row.pick_rank === 1 || row.pick_rank === '1') return 'best';
  if (row.pick_rank === 2 || row.pick_rank === '2') return 'secondary';

  const name = String(row.pick_name ?? '').toLowerCase();
  if (name.includes('best')) return 'best';
  if (name.includes('secondary')) return 'secondary';

  // Fallback: parse the suffix of source (discord:...:best | discord:...:secondary)
  const source = String(row.source ?? '').trim();
  if (source) {
    const last = source.split(':').pop();
    return normalizeTier(last);
  }

  return 'unknown';
}

function normalizeResult(input: unknown): AllowedResult {
  const s = String(input ?? '').trim().toUpperCase();
  if (s === 'W' || s === 'L' || s === 'P' || s === 'PENDING') return s as AllowedResult;
  return 'PENDING';
}

function preferBook(row: SupabasePickRow): string {
  const sportsbook = row.sportsbook ?? row.sports_book ?? row.sportsBook;
  const book = row.book;
  const chosen = sportsbook || book;
  return chosen ? String(chosen) : 'Unknown';
}

export function adaptSupabasePick(row: SupabasePickRow): Pick {
  const createdAt = row.created_at ?? row.createdAt ?? new Date().toISOString();

  return {
    id: String(row.id ?? row.source ?? crypto?.randomUUID?.() ?? `p_${Math.random().toString(36).slice(2)}`),

    // pick_date → date
    date: String(row.pick_date ?? row.date ?? ''),

    // league (cast to dashboard type)
    league: row.league as Pick['league'],

    // bet_type → betType
    betType: row.bet_type as Pick['betType'],

    // game → matchup
    matchup: String(row.game ?? row.matchup ?? ''),

    // Missing fields (startTimeET, lineMate) → undefined
    startTimeET: undefined as any,

    pick: String(row.pick ?? ''),
    units: Number(row.units ?? 0),
    confidence: Number(row.confidence ?? 0),
    confidenceTier: parseConfidenceTier(row),

    // reasoning → researchSummary
    researchSummary: String(row.reasoning ?? ''),

    // odds, book, market, line → oddsAtPick (ts falls back to created_at)
    oddsAtPick: {
      book: preferBook(row),
      market: String(row.market ?? ''),
      line: String(row.line ?? ''),
      odds: Number(row.odds ?? 0),
      ts: String(row.ts ?? row.odds_ts ?? createdAt),
    },

    // graded_at → settledTs
    settledTs: row.graded_at ? String(row.graded_at) : undefined,

    // Result casing normalization
    result: normalizeResult(row.result),

    lineMate: undefined,
  };
}

export function adaptSupabasePicks(rows: SupabasePickRow[]): Pick[] {
  return (rows || []).map(adaptSupabasePick);
}
