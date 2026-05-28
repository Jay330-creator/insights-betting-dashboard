import { useMemo, useState } from 'react';
import type { Pick, League, BetType, Result } from '../data/sample';
import { fmtOdds } from '../lib/format';

export function PickTable({ picks }: { picks: Pick[] }) {
  const [league, setLeague] = useState<League | 'ALL'>('ALL');
  const [betType, setBetType] = useState<BetType | 'ALL'>('ALL');
  const [result, setResult] = useState<Result | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    return picks.filter((p) => {
      if (league !== 'ALL' && p.league !== league) return false;
      if (betType !== 'ALL' && p.betType !== betType) return false;
      if (result !== 'ALL' && p.result !== result) return false;
      return true;
    });
  }, [picks, league, betType, result]);

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <div className="text-sm font-semibold">Filters</div>
        <select
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={league}
          onChange={(e) => setLeague(e.target.value as any)}
        >
          <option value="ALL">All leagues</option>
          <option value="NBA">NBA</option>
          <option value="NCAAB">NCAAB</option>
          <option value="NHL">NHL</option>
        </select>
        <select
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={betType}
          onChange={(e) => setBetType(e.target.value as any)}
        >
          <option value="ALL">All bet types</option>
          <option value="moneyline">Moneyline</option>
          <option value="spread">Spread</option>
          <option value="total">Total</option>
          <option value="player_prop">Player prop</option>
          <option value="parlay">Parlay</option>
        </select>
        <select
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={result}
          onChange={(e) => setResult(e.target.value as any)}
        >
          <option value="ALL">All results</option>
          <option value="W">Win</option>
          <option value="L">Loss</option>
          <option value="P">Push</option>
          <option value="PENDING">Pending</option>
        </select>
        <div className="ml-auto text-xs text-muted">{filtered.length} picks</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="bg-bg text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">League</th>
              <th className="px-4 py-2">Matchup</th>
              <th className="px-4 py-2">Market</th>
              <th className="px-4 py-2">Pick</th>
              <th className="px-4 py-2">Odds</th>
              <th className="px-4 py-2">Units</th>
              <th className="px-4 py-2">Conf</th>
              <th className="px-4 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-bg">
                <td className="px-4 py-2 text-muted">{p.date}</td>
                <td className="px-4 py-2 text-text">{p.league}</td>
                <td className="px-4 py-2 text-muted">{p.matchup}</td>
                <td className="px-4 py-2 text-muted">{p.betType}</td>
                <td className="px-4 py-2 font-semibold text-text">{p.pick}</td>
                <td className="px-4 py-2 font-mono text-muted">{fmtOdds(p.oddsAtPick.odds)}</td>
                <td className="px-4 py-2 font-mono text-muted">{p.units.toFixed(1)}</td>
                <td className="px-4 py-2 font-mono text-muted">{p.confidence.toFixed(1)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`font-bold ${
                      p.result === 'W'
                        ? 'text-accent'
                        : p.result === 'L'
                          ? 'text-loss'
                          : p.result === 'PENDING'
                            ? 'text-pending'
                            : 'text-muted'
                    }`}
                  >
                    {p.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
