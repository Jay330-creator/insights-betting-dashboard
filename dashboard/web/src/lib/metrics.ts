import type { Pick, Result, BetType, League } from '../data/sample';

export interface Totals {
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  unitsNet: number;
  bets: number;
}

export function americanToDecimal(american: number): number {
  if (american === 0) return 1;
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

export function resultToCounts(r: Result) {
  return {
    W: r === 'W' ? 1 : 0,
    L: r === 'L' ? 1 : 0,
    P: r === 'P' ? 1 : 0,
    PENDING: r === 'PENDING' ? 1 : 0,
  };
}

export function calcUnitsNet(picks: Pick[]): number {
  // Demo assumption: 1u risk per pick; return based on odds if W; -units if L; 0 if P.
  // This is a simplification for portfolio demo (real books can differ).
  return picks.reduce((acc, p) => {
    if (p.result === 'W') {
      const dec = americanToDecimal(p.oddsAtPick.odds);
      const profit = p.units * (dec - 1);
      return acc + profit;
    }
    if (p.result === 'L') return acc - p.units;
    return acc;
  }, 0);
}

export function summarize(picks: Pick[]): Totals {
  const wins = picks.filter(p => p.result === 'W').length;
  const losses = picks.filter(p => p.result === 'L').length;
  const pushes = picks.filter(p => p.result === 'P').length;
  const pending = picks.filter(p => p.result === 'PENDING').length;
  const bets = picks.length;
  const unitsNet = calcUnitsNet(picks);
  return { wins, losses, pushes, pending, unitsNet, bets };
}

export function winRate(t: Totals): number {
  const denom = t.wins + t.losses;
  return denom === 0 ? 0 : t.wins / denom;
}

export function roi(t: Totals, picks: Pick[]): number {
  const staked = picks.reduce((acc, p) => acc + p.units, 0);
  return staked === 0 ? 0 : t.unitsNet / staked;
}

export function groupBy<T extends string>(picks: Pick[], keyFn: (p: Pick) => T): Record<T, Pick[]> {
  return picks.reduce((acc, p) => {
    const k = keyFn(p);
    (acc[k] ||= []).push(p);
    return acc;
  }, {} as Record<T, Pick[]>);
}

export function byLeague(picks: Pick[]) {
  return groupBy(picks, p => p.league as League);
}

export function byBetType(picks: Pick[]) {
  return groupBy(picks, p => p.betType as BetType);
}
