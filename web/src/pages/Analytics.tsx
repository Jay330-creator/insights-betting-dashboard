import { useMemo } from 'react';
import { summarize, winRate, roi, byLeague, byBetType, byConfidenceTier } from '../lib/metrics';
import { fmtPct, fmtUnits } from '../lib/format';
import { usePicks } from '../lib/usePicks';

function StatRow({ title, picksCount, record, wr, roiPct, units }: any) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="text-muted">Picks</div><div className="text-right font-mono font-semibold tabular-nums">{picksCount}</div>
        <div className="text-muted">Record</div><div className="text-right font-mono font-semibold tabular-nums">{record}</div>
        <div className="text-muted">Win rate</div><div className="text-right font-mono font-semibold tabular-nums">{wr}</div>
        <div className="text-muted">ROI</div><div className="text-right font-mono font-semibold tabular-nums">{roiPct}</div>
        <div className="text-muted">Units</div><div className="text-right font-mono font-semibold tabular-nums">{units}</div>
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
    return <div className="rounded-md border border-border bg-card p-5">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-border bg-card p-5">
        <div className="text-lg font-extrabold">Failed to load picks</div>
        <div className="mt-2 text-sm text-muted">{error}</div>
        <div className="mt-3 text-sm text-muted">Tip: add <span className="font-mono">?demo=1</span> to the URL to use demo data.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-5">
        <div className="text-3xl font-extrabold tracking-tight">Performance Analytics</div>
        <div className="mt-1 text-sm text-muted">Breakdowns by league and bet type.</div>
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
