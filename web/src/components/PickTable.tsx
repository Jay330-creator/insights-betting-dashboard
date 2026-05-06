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
    <div className="rounded-2xl border border-border bg-panel shadow-glow">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <div className="text-sm font-semibold">Filters</div>
        <select className="rounded-lg border border-border bg-black/20 px-2 py-1 text-sm" value={league} onChange={(e) => setLeague(e.target.value as any)}>
          <option value="ALL">All leagues</option>
          <option value="NBA">NBA</option>
          <option value="NCAAB">NCAAB</option>
          <option value="NHL">NHL</option>
        </select>
        <select className="rounded-lg border border-border bg-black/20 px-2 py-1 text-sm" value={betType} onChange={(e) => setBetType(e.target.value as any)}>
          <option value="ALL">All bet types</option>
          <option value="moneyline">Moneyline</option>
          <option value="spread">Spread</option>
          <option value="total">Total</option>
          <option value="player_prop">Player prop</option>
          <option value="parlay">Parlay</option>
        </select>
        <select className="rounded-lg border border-border bg-black/20 px-2 py-1 text-sm" value={result} onChange={(e) => setResult(e.target.value as any)}>
          <option value="ALL">All results</option>
          <option value="W">Win</option>
          <option value="L">Loss</option>
          <option value="P">Push</option>
          <option value="PENDING">Pending</option>
        </select>
        <div className="ml-auto text-xs text-gray-400">{filtered.length} picks</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs font-semibold text-gray-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">League</th>
              <th className="px-4 py-3">Matchup</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Pick</th>
              <th className="px-4 py-3">Odds</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Conf</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-white/3">
                <td className="px-4 py-3 text-gray-300">{p.date}</td>
                <td className="px-4 py-3">{p.league}</td>
                <td className="px-4 py-3 text-gray-300">{p.matchup}</td>
                <td className="px-4 py-3 text-gray-300">{p.betType}</td>
                <td className="px-4 py-3 font-semibold">{p.pick}</td>
                <td className="px-4 py-3 text-gray-300">{fmtOdds(p.oddsAtPick.odds)}</td>
                <td className="px-4 py-3 text-gray-300">{p.units.toFixed(1)}</td>
                <td className="px-4 py-3 text-gray-300">{p.confidence.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <span className={
                    p.result === 'W'
                      ? 'text-emerald-300'
                      : p.result === 'L'
                        ? 'text-rose-300'
                        : p.result === 'P'
                          ? 'text-amber-300'
                          : 'text-gray-400'
                  }>
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
