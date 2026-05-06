import { useMemo } from 'react';
import { KpiCard } from '../components/KpiCard';
import { calcUnitsNet } from '../lib/metrics';
import { fmtUnits } from '../lib/format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Legend,
  ReferenceLine,
} from 'recharts';
import { usePicks } from '../lib/usePicks';
import { usePickCosts } from '../lib/usePickCosts';

function fmtUsd(v: number): string {
  if (!Number.isFinite(v)) return '$0.00';
  return `$${v.toFixed(4)}`;
}

function truncate(s: string, n: number): string {
  const str = String(s || '');
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

export default function Costs() {
  const { picks, loading: picksLoading, error: picksError } = usePicks();
  const { costsByPickId, loading: costsLoading, error: costsError } = usePickCosts();

  const loading = picksLoading || costsLoading;
  const error = picksError || costsError;

  const rows = useMemo(() => {
    return picks.map((p) => {
      const cost = Number(costsByPickId[p.id] ?? 0);
      const units = Number(calcUnitsNet([p]).toFixed(2));
      return { ...p, cost, units };
    });
  }, [picks, costsByPickId]);

  const totalCost = useMemo(() => rows.reduce((acc, r) => acc + (Number.isFinite(r.cost) ? r.cost : 0), 0), [rows]);
  const totalProfitUnits = useMemo(() => Number(calcUnitsNet(picks).toFixed(2)), [picks]);

  const wins = useMemo(() => picks.filter((p) => p.result === 'W').length, [picks]);
  const picksCount = picks.length;

  const costPerPick = picksCount ? totalCost / picksCount : 0;
  const costPerWin = wins ? totalCost / wins : 0;
  const roiOnCompute = totalCost > 0 ? totalProfitUnits / totalCost : 0; // units per $ spent

  const costOverTime = useMemo(() => {
    const map = new Map<string, { date: string; dateLabel: string; costUsd: number }>();
    for (const r of rows) {
      const d = r.date || 'unknown';
      const entry = map.get(d) || { date: d, dateLabel: d.length >= 10 ? d.slice(5) : d, costUsd: 0 };
      entry.costUsd += Number.isFinite(r.cost) ? r.cost : 0;
      map.set(d, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((x) => ({ ...x, costUsd: Number(x.costUsd.toFixed(4)) }));
  }, [rows]);

  const mostExpensive = useMemo(() => {
    return [...rows]
      .filter((r) => Number.isFinite(r.cost) && r.cost > 0)
      .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        label: truncate(`${r.date} • ${r.pick}`, 30),
        costUsd: Number(r.cost.toFixed(4)),
        result: r.result,
      }));
  }, [rows]);

  const costVsProfitByDay = useMemo(() => {
    const map = new Map<
      string,
      { date: string; dateLabel: string; costUsd: number; profitUnits: number }
    >();

    for (const r of rows) {
      const d = r.date || 'unknown';
      const entry = map.get(d) || { date: d, dateLabel: d.length >= 10 ? d.slice(5) : d, costUsd: 0, profitUnits: 0 };
      entry.costUsd += Number.isFinite(r.cost) ? r.cost : 0;
      entry.profitUnits += Number.isFinite(r.units) ? r.units : 0;
      map.set(d, entry);
    }

    return Array.from(map.values())
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((x) => ({
        ...x,
        costUsd: Number(x.costUsd.toFixed(4)),
        profitUnits: Number(x.profitUnits.toFixed(2)),
      }));
  }, [rows]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-lg font-extrabold">Failed to load costs</div>
        <div className="mt-2 text-sm text-gray-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-3xl font-extrabold tracking-tight">Costs</div>
        <div className="mt-1 text-sm text-gray-400">Compute spend and efficiency.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Total Cost" value={fmtUsd(totalCost)} />
        <KpiCard label="Cost / Pick" value={fmtUsd(costPerPick)} />
        <KpiCard label="Cost / Winning Pick" value={fmtUsd(costPerWin)} />
        <KpiCard label="ROI on compute" value={`${roiOnCompute.toFixed(2)} u/$`} tone={roiOnCompute >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Cost Over Time</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costOverTime} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="dateLabel" stroke="rgba(255,255,255,.45)" />
                <YAxis stroke="rgba(255,255,255,.45)" tickFormatter={(v) => fmtUsd(Number(v))} />
                <Tooltip
                  contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }}
                  formatter={(v: any) => [fmtUsd(Number(v)), 'Cost']}
                  labelFormatter={(_, payload: any) => payload?.[0]?.payload?.date || ''}
                />
                <Line type="monotone" dataKey="costUsd" stroke="#ef4444" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Most Expensive Picks</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostExpensive} layout="vertical" margin={{ left: 16, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis type="number" stroke="rgba(255,255,255,.45)" tickFormatter={(v) => fmtUsd(Number(v))} />
                <YAxis type="category" dataKey="label" stroke="rgba(255,255,255,.45)" width={140} />
                <Tooltip
                  contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }}
                  formatter={(v: any) => [fmtUsd(Number(v)), 'Cost']}
                />
                <Bar dataKey="costUsd" name="Cost" radius={[6, 6, 6, 6]}>
                  {mostExpensive.map((r) => {
                    const fill = r.result === 'W' ? '#22c55e' : r.result === 'L' ? '#ef4444' : r.result === 'P' ? '#94a3b8' : 'transparent';
                    const stroke = r.result === 'PENDING' ? 'rgba(148,163,184,.8)' : 'transparent';
                    return <Cell key={r.id} fill={fill} stroke={stroke} strokeWidth={2} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
        <div className="mb-3 text-sm font-semibold">Cost vs Profit by Day</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={costVsProfitByDay} margin={{ left: 8, right: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="dateLabel" stroke="rgba(255,255,255,.45)" />
              <YAxis yAxisId="cost" stroke="rgba(255,255,255,.45)" tickFormatter={(v) => fmtUsd(Number(v))} />
              <YAxis yAxisId="profit" orientation="right" stroke="rgba(255,255,255,.45)" tickFormatter={(v) => fmtUnits(Number(v))} />
              <Tooltip
                contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }}
                formatter={(v: any, name: any) => {
                  if (name === 'costUsd') return [fmtUsd(Number(v)), 'Cost'];
                  if (name === 'profitUnits') return [fmtUnits(Number(v)), 'Profit'];
                  return [v, name];
                }}
                labelFormatter={(_, payload: any) => payload?.[0]?.payload?.date || ''}
              />
              <Legend />
              <ReferenceLine yAxisId="profit" y={0} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />
              <Bar yAxisId="cost" dataKey="costUsd" fill="#ef4444" name="Daily cost" />
              <Line yAxisId="profit" type="monotone" dataKey="profitUnits" stroke="#22c55e" strokeWidth={3} dot={false} name="Daily profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
