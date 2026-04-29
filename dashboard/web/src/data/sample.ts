export type League = 'NBA' | 'NCAAB' | 'NHL';
export type BetType = 'moneyline' | 'spread' | 'total' | 'player_prop' | 'parlay';
export type Result = 'W' | 'L' | 'P' | 'PENDING';

export interface OddsSnap {
  book: string;
  market: string;
  line: string;
  odds: number; // American
  ts: string; // ISO
}

export interface LineMateSummary {
  provider: 'LineMate';
  ts: string;
  status: 'ok' | 'partial' | 'error';
  notes: string;
  opening?: OddsSnap;
  current?: OddsSnap;
  closing?: OddsSnap;
}

export interface Pick {
  id: string;
  date: string; // YYYY-MM-DD
  league: League;
  betType: BetType;
  matchup: string;
  startTimeET: string; // e.g., '7:10 PM'
  pick: string;
  units: number;
  confidence: number; // 0-10
  researchSummary: string;
  oddsAtPick: OddsSnap;
  lineMate?: LineMateSummary;
  result: Result;
  settledTs?: string;
}

export interface DailyCard {
  date: string;
  picks: Pick[];
}

// Demo sample dataset (portfolio-safe; not real financial advice / not real outcomes)
export const sampleCards: DailyCard[] = [
  {
    date: '2026-04-21',
    picks: [
      {
        id: 'p_2026-04-21_nba_1',
        date: '2026-04-21',
        league: 'NBA',
        betType: 'spread',
        matchup: 'Miami Heat @ Charlotte Hornets',
        startTimeET: '7:10 PM',
        pick: 'Heat -2.5',
        units: 1,
        confidence: 7.8,
        researchSummary: 'Injury edge + pace control. Heat half-court defense vs Hornets shot diet; projected close game where late execution favors Miami.',
        oddsAtPick: {
          book: 'FanDuel',
          market: 'Spread',
          line: 'Heat -2.5',
          odds: -110,
          ts: '2026-04-21T16:00:00Z',
        },
        lineMate: {
          provider: 'LineMate',
          ts: '2026-04-21T16:00:10Z',
          status: 'ok',
          notes: 'Market stable; small movement toward Miami across major books.',
          opening: { book: 'FanDuel', market: 'Spread', line: 'Heat -1.5', odds: -110, ts: '2026-04-21T12:00:00Z' },
          current: { book: 'FanDuel', market: 'Spread', line: 'Heat -2.5', odds: -110, ts: '2026-04-21T16:00:00Z' },
          closing: { book: 'FanDuel', market: 'Spread', line: 'Heat -3', odds: -112, ts: '2026-04-21T23:55:00Z' },
        },
        result: 'W',
        settledTs: '2026-04-22T03:10:00Z',
      },
      {
        id: 'p_2026-04-21_nba_2',
        date: '2026-04-21',
        league: 'NBA',
        betType: 'player_prop',
        matchup: 'Boston Celtics vs Milwaukee Bucks',
        startTimeET: '8:00 PM',
        pick: 'J. Brown OVER 39.5 PRA',
        units: 0.5,
        confidence: 7.2,
        researchSummary: 'Projection edge driven by usage with rotation absences; monitor late injury tags. Preferred if game remains within 8 points entering 4Q.',
        oddsAtPick: { book: 'FanDuel', market: 'PRA', line: 'Over 39.5', odds: -108, ts: '2026-04-21T16:00:00Z' },
        lineMate: {
          provider: 'LineMate',
          ts: '2026-04-21T16:00:12Z',
          status: 'partial',
          notes: 'Prop market limited book coverage; best price found at FanDuel.',
        },
        result: 'L',
        settledTs: '2026-04-22T03:45:00Z',
      },
    ],
  },
  {
    date: '2026-04-22',
    picks: [
      {
        id: 'p_2026-04-22_ncaab_1',
        date: '2026-04-22',
        league: 'NCAAB',
        betType: 'total',
        matchup: "St. John's vs Kansas",
        startTimeET: '5:15 PM',
        pick: 'Under 150.5',
        units: 1,
        confidence: 7.6,
        researchSummary: 'Tempo + defensive rebounding profile suppresses second-chance points. Value tied to maintaining half-court possession count.',
        oddsAtPick: { book: 'Best Available', market: 'Total', line: 'Under 150.5', odds: -112, ts: '2026-04-22T15:30:00Z' },
        lineMate: {
          provider: 'LineMate',
          ts: '2026-04-22T15:30:11Z',
          status: 'ok',
          notes: 'Total ticked down 1.0 point; no further steam detected.',
          opening: { book: 'FanDuel', market: 'Total', line: '151.5', odds: -110, ts: '2026-04-22T12:00:00Z' },
          current: { book: 'FanDuel', market: 'Total', line: '150.5', odds: -112, ts: '2026-04-22T15:30:00Z' },
          closing: { book: 'FanDuel', market: 'Total', line: '150', odds: -115, ts: '2026-04-22T21:00:00Z' },
        },
        result: 'W',
        settledTs: '2026-04-22T22:00:00Z',
      },
    ],
  },
  {
    date: '2026-04-23',
    picks: [
      {
        id: 'p_2026-04-23_nba_1',
        date: '2026-04-23',
        league: 'NBA',
        betType: 'moneyline',
        matchup: 'LA Clippers @ New Orleans Pelicans',
        startTimeET: '8:00 PM',
        pick: 'Pelicans ML',
        units: 1,
        confidence: 7.4,
        researchSummary: 'Home court + rest edge; Pelicans creation vs Clippers second unit. Lean downgraded if starting PG confirmed in.',
        oddsAtPick: { book: 'FanDuel', market: 'ML', line: 'Pelicans', odds: -132, ts: '2026-04-23T16:00:00Z' },
        lineMate: {
          provider: 'LineMate',
          ts: '2026-04-23T16:00:07Z',
          status: 'ok',
          notes: 'Small reverse line movement; market not aligned. Keep size modest.',
          opening: { book: 'FanDuel', market: 'ML', line: 'Pelicans', odds: -145, ts: '2026-04-23T12:00:00Z' },
          current: { book: 'FanDuel', market: 'ML', line: 'Pelicans', odds: -132, ts: '2026-04-23T16:00:00Z' },
          closing: { book: 'FanDuel', market: 'ML', line: 'Pelicans', odds: -120, ts: '2026-04-23T23:55:00Z' },
        },
        result: 'L',
        settledTs: '2026-04-24T03:10:00Z',
      },
      {
        id: 'p_2026-04-23_nhl_1',
        date: '2026-04-23',
        league: 'NHL',
        betType: 'moneyline',
        matchup: 'Boston Bruins @ New York Rangers',
        startTimeET: '7:00 PM',
        pick: 'Bruins ML',
        units: 0.5,
        confidence: 7.1,
        researchSummary: 'Goalie + special teams edge; prefer regulation if price improves. Bruins better on forecheck vs NYR breakout.',
        oddsAtPick: { book: 'Best Available', market: 'ML', line: 'Bruins', odds: +120, ts: '2026-04-23T15:10:00Z' },
        result: 'P',
        settledTs: '2026-04-24T02:30:00Z',
      },
    ],
  },
];
