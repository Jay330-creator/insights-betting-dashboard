import { sampleCards } from '../data/sample';
import { KpiCard } from '../components/KpiCard';
import { summarize, winRate, roi, byLeague, byBetType } from '../lib/metrics';
import { fmtPct, fmtUnits } from '../lib/format';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

const allPicks = sampleCards.flatMap((c) => c.picks);

export default function Overview() {
  const totals = summarize(allPicks);
  const wr = winRate(totals);
  const r = roi(totals, allPicks);

  const byDay = sampleCards.map((c) => {
    const t = summarize(c.picks);
    return {
      date: c.date.slice(5),
      unitsNet: Number(t.unitsNet.toFixed(2)),
      wins: t.wins,
      losses: t.losses,
    };
  });

  const leagueBars = Object.entries(byLeague(allPicks)).map(([league, picks]) => {
    const t = summarize(picks);
    return { league, winRate: Number((winRate(t) * 100).toFixed(1)), units: Number(t.unitsNet.toFixed(2)) };
  });

  const typeBars = Object.entries(byBetType(allPicks)).map(([type, picks]) => {
    const t = summarize(picks);
    return { type, winRate: Number((winRate(t) * 100).toFixed(1)), units: Number(t.unitsNet.toFixed(2)) };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-3xl font-extrabold tracking-tight">Overview</div>
        <div className="mt-1 text-sm text-gray-400">High-level KPIs, MTD performance, and trend snapshots (sample data).</div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Record" value={`${totals.wins}-${totals.losses}-${totals.pushes}`} sub={`${totals.pending} pending`} />
        <KpiCard label="Win Rate" value={fmtPct(wr)} />
        <KpiCard label="ROI" value={fmtPct(r)} tone={r >= 0 ? 'good' : 'bad'} />
        <KpiCard label="Units Net" value={fmtUnits(totals.unitsNet)} tone={totals.unitsNet >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Units Net by Day</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,.45)" />
                <YAxis stroke="rgba(255,255,255,.45)" />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }} />
                <Line type="monotone" dataKey="unitsNet" stroke="#38bdf8" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Win Rate / Units by League</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leagueBars} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="league" stroke="rgba(255,255,255,.45)" />
                <YAxis stroke="rgba(255,255,255,.45)" />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }} />
                <Bar dataKey="winRate" fill="#22c55e" name="Win Rate %" />
                <Bar dataKey="units" fill="#38bdf8" name="Units Net" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
        <div className="mb-3 text-sm font-semibold">Win Rate / Units by Bet Type</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeBars} margin={{ left: 8, right: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="type" stroke="rgba(255,255,255,.45)" />
              <YAxis stroke="rgba(255,255,255,.45)" />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }} />
              <Bar dataKey="winRate" fill="#f59e0b" name="Win Rate %" />
              <Bar dataKey="units" fill="#38bdf8" name="Units Net" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
