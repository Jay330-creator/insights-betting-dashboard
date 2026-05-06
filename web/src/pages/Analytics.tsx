import { useMemo } from 'react';
import { summarize, winRate, roi, byLeague, byBetType, byConfidenceTier } from '../lib/metrics';
import { fmtPct, fmtUnits } from '../lib/format';
import { usePicks } from '../lib/usePicks';

function StatRow({ title, picksCount, record, wr, roiPct, units }: any) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="text-gray-400">Picks</div><div className="text-right font-semibold">{picksCount}</div>
        <div className="text-gray-400">Record</div><div className="text-right font-semibold">{record}</div>
        <div className="text-gray-400">Win rate</div><div className="text-right font-semibold">{wr}</div>
        <div className="text-gray-400">ROI</div><div className="text-right font-semibold">{roiPct}</div>
        <div className="text-gray-400">Units</div><div className="text-right font-semibold">{units}</div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { picks, loading, error } = usePicks();

  const league = useMemo(() => byLeague(picks), [picks]);
  const betType = useMemo(() => byBetType(picks), [picks]);
  const tier = useMemo(() => byConfidenceTier(picks), [picks]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-lg font-extrabold">Failed to load picks</div>
        <div className="mt-2 text-sm text-gray-400">{error}</div>
        <div className="mt-3 text-sm text-gray-400">Tip: add <span className="font-mono">?demo=1</span> to the URL to use demo data.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-3xl font-extrabold tracking-tight">Performance Analytics</div>
        <div className="mt-1 text-sm text-gray-400">Breakdowns by league and bet type.</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(league).map(([k, picks]) => {
          const t = summarize(picks);
          return (
            <StatRow
              key={k}
              title={k}
              picksCount={picks.length}
              record={`${t.wins}-${t.losses}-${t.pushes}`}
              wr={fmtPct(winRate(t))}
              roiPct={fmtPct(roi(t, picks))}
              units={fmtUnits(t.unitsNet)}
            />
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(betType).map(([k, picks]) => {
          const t = summarize(picks);
          return (
            <StatRow
              key={k}
              title={k}
              picksCount={picks.length}
              record={`${t.wins}-${t.losses}-${t.pushes}`}
              wr={fmtPct(winRate(t))}
              roiPct={fmtPct(roi(t, picks))}
              units={fmtUnits(t.unitsNet)}
            />
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(tier).map(([k, picks]) => {
          const t = summarize(picks);
          return (
            <StatRow
              key={k}
              title={`Confidence Tier: ${k}`}
              picksCount={picks.length}
              record={`${t.wins}-${t.losses}-${t.pushes}`}
              wr={fmtPct(winRate(t))}
              roiPct={fmtPct(roi(t, picks))}
              units={fmtUnits(t.unitsNet)}
            />
          );
        })}
      </div>
    </div>
  );
}
