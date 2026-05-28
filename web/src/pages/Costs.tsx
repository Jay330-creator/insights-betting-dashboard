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
    return <div className="rounded-md border border-border bg-card p-5">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-border bg-card p-5">
        <div className="text-lg font-extrabold">Failed to load costs</div>
        <div className="mt-2 text-sm text-muted">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-5">
        <div className="text-3xl font-extrabold tracking-tight">Costs</div>
        <div className="mt-1 text-sm text-muted">Compute spend and efficiency.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Total Cost" value={fmtUsd(totalCost)} />
        <KpiCard label="Cost / Pick" value={fmtUsd(costPerPick)} />
        <KpiCard label="Cost / Winning Pick" value={fmtUsd(costPerWin)} />
        <KpiCard label="ROI on compute" value={`${roiOnCompute.toFixed(2)} u/$`} tone={roiOnCompute >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Cost Over Time</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costOverTime} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="#262C34" />
                <XAxis dataKey="dateLabel" stroke="#8B949E" />
                <YAxis stroke="#8B949E" tickFormatter={(v) => fmtUsd(Number(v))} />
                <Tooltip
                  contentStyle={{ background: '#161A1F', border: '1px solid #262C34' }}
                  formatter={(v: any) => [fmtUsd(Number(v)), 'Cost']}
                  labelFormatter={(_, payload: any) => payload?.[0]?.payload?.date || ''}
                />
                <Line type="monotone" dataKey="costUsd" stroke="#FF4757" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Most Expensive Picks</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostExpensive} layout="vertical" margin={{ left: 16, right: 8 }}>
                <CartesianGrid stroke="#262C34" />
                <XAxis type="number" stroke="#8B949E" tickFormatter={(v) => fmtUsd(Number(v))} />
                <YAxis type="category" dataKey="label" stroke="#8B949E" width={140} />
                <Tooltip
                  contentStyle={{ background: '#161A1F', border: '1px solid #262C34' }}
                  formatter={(v: any) => [fmtUsd(Number(v)), 'Cost']}
                />
                <Bar dataKey="costUsd" name="Cost" radius={[6, 6, 6, 6]}>
                  {mostExpensive.map((r) => {
                    const fill = r.result === 'W' ? '#00D26A' : r.result === 'L' ? '#FF4757' : r.result === 'P' ? '#8B949E' : 'transparent';
                    const stroke = r.result === 'PENDING' ? '#FFB020' : 'transparent';
                    return <Cell key={r.id} fill={fill} stroke={stroke} strokeWidth={2} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Cost vs Profit by Day</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={costVsProfitByDay} margin={{ left: 8, right: 8 }}>
              <CartesianGrid stroke="#262C34" />
              <XAxis dataKey="dateLabel" stroke="#8B949E" />
              <YAxis yAxisId="cost" stroke="#8B949E" tickFormatter={(v) => fmtUsd(Number(v))} />
              <YAxis yAxisId="profit" orientation="right" stroke="#8B949E" tickFormatter={(v) => fmtUnits(Number(v))} />
              <Tooltip
                contentStyle={{ background: '#161A1F', border: '1px solid #262C34' }}
                formatter={(v: any, name: any) => {
                  if (name === 'costUsd') return [fmtUsd(Number(v)), 'Cost'];
                  if (name === 'profitUnits') return [fmtUnits(Number(v)), 'Profit'];
                  return [v, name];
                }}
                labelFormatter={(_, payload: any) => payload?.[0]?.payload?.date || ''}
              />
              <Legend />
              <ReferenceLine yAxisId="profit" y={0} stroke="#8B949E" strokeDasharray="4 4" />
              <Bar yAxisId="cost" dataKey="costUsd" fill="#FF4757" name="Daily cost" />
              <Line yAxisId="profit" type="monotone" dataKey="profitUnits" stroke="#00D26A" strokeWidth={3} dot={false} name="Daily profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
