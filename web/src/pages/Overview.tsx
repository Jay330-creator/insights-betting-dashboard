import { useMemo } from 'react';
import { KpiCard } from '../components/KpiCard';
import { summarize, winRate, roi, calcUnitsNet } from '../lib/metrics';
import { fmtPct, fmtUnits } from '../lib/format';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { usePicks } from '../lib/usePicks';
import { usePickCosts } from '../lib/usePickCosts';

export default function Overview() {
  const { picks: allPicks, loading, error } = usePicks();
  const { costsByPickId } = usePickCosts();

  const totals = useMemo(() => summarize(allPicks), [allPicks]);
  const wr = useMemo(() => winRate(totals), [totals]);
  const r = useMemo(() => roi(totals, allPicks), [totals, allPicks]);

  const cumulativeByDay = useMemo(() => {
    // group by pick.date (YYYY-MM-DD)
    const map = new Map<string, typeof allPicks>();
    for (const p of allPicks) {
      const d = p.date || 'unknown';
      const arr = map.get(d);
      if (arr) arr.push(p);
      else map.set(d, [p]);
    }

    let running = 0;
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, picks]) => {
        const t = summarize(picks);
        const unitsDay = Number(t.unitsNet.toFixed(2));
        running = Number((running + unitsDay).toFixed(2));
        return {
          date,
          dateLabel: date.length >= 10 ? date.slice(5) : date,
          unitsDay,
          cumUnits: running,
          cumPos: running > 0 ? running : 0,
          cumNeg: running < 0 ? running : 0,
        };
      });
  }, [allPicks]);

  const recentForm = useMemo(() => {
    const sorted = [...allPicks]
      .filter((p) => Boolean(p.date))
      .sort((a, b) => {
        const da = a.date || '';
        const db = b.date || '';
        if (da !== db) return da < db ? -1 : 1;
        const ta = a.oddsAtPick?.ts || '';
        const tb = b.oddsAtPick?.ts || '';
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });
    const last = sorted.slice(-15);
    return last;
  }, [allPicks]);

  const profitBySport = useMemo(() => {
    const leagueToSport: Record<string, string> = {
      NBA: 'Basketball',
      WNBA: 'Basketball',
      NCAAB: 'Basketball',
      MLB: 'Baseball',
      NHL: 'Hockey',
      NFL: 'Football',
    };

    const buckets = new Map<string, typeof allPicks>();
    for (const p of allPicks) {
      const league = String((p as any).league || '').trim();
      const sport = leagueToSport[league] || league || 'Unknown';
      const arr = buckets.get(sport);
      if (arr) arr.push(p);
      else buckets.set(sport, [p]);
    }

    return Array.from(buckets.entries())
      .map(([sport, picks]) => {
        const t = summarize(picks);
        return { sport, units: Number(t.unitsNet.toFixed(2)) };
      })
      .sort((a, b) => Math.abs(b.units) - Math.abs(a.units));
  }, [allPicks]);

  const confidenceVsOutcome = useMemo(() => {
    return allPicks
      .map((p) => {
        const confidence = Number(p.confidence ?? 0);
        const units = Number(calcUnitsNet([p]).toFixed(2));
        return {
          confidence,
          units,
          result: p.result,
          label: p.pick,
          date: p.date,
          id: p.id,
        };
      })
      .filter((d) => Number.isFinite(d.confidence) && Number.isFinite(d.units));
  }, [allPicks]);

  const costVsProfit = useMemo(() => {
    return allPicks
      .map((p) => {
        const cost = Number(costsByPickId[p.id] ?? 0);
        const units = Number(calcUnitsNet([p]).toFixed(2));
        return {
          cost,
          units,
          result: p.result,
          label: p.pick,
          date: p.date,
          id: p.id,
        };
      })
      .filter((d) => Number.isFinite(d.cost) && d.cost > 0 && Number.isFinite(d.units));
  }, [allPicks, costsByPickId]);

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
          <div className="mb-3 text-sm font-semibold">Cumulative Units (running total)</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeByDay} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="dateLabel" stroke="rgba(255,255,255,.45)" />
                <YAxis stroke="rgba(255,255,255,.45)" />
                <Tooltip
                  contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }}
                  formatter={(v: any, name: any) => {
                    if (name === 'cumUnits') return [fmtUnits(Number(v)), 'Cumulative'];
                    if (name === 'unitsDay') return [fmtUnits(Number(v)), 'Day'];
                    return [v, name];
                  }}
                  labelFormatter={(label: any, payload: any) => {
                    const full = payload?.[0]?.payload?.date;
                    return full || label;
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />

                <Area type="monotone" dataKey="cumPos" stroke="none" fill="rgba(34,197,94,.18)" dot={false} />
                <Area type="monotone" dataKey="cumNeg" stroke="none" fill="rgba(239,68,68,.18)" dot={false} />
                <Line type="monotone" dataKey="cumUnits" stroke="#38bdf8" strokeWidth={3} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Recent Form</div>
          <div className="flex h-72 flex-col justify-between">
            <div className="text-sm text-gray-400">Most recent {recentForm.length} picks</div>
            <div className="flex flex-wrap items-center gap-2">
              {recentForm.map((p) => {
                const r = p.result;
                const base = 'h-3 w-3 rounded-sm';
                const cls =
                  r === 'W'
                    ? `${base} bg-emerald-400`
                    : r === 'L'
                      ? `${base} bg-red-400`
                      : r === 'P'
                        ? `${base} bg-gray-400`
                        : `${base} border border-gray-500 bg-transparent`;

                return (
                  <div
                    key={p.id}
                    className={cls}
                    title={`${p.date} • ${p.pick}`}
                    aria-label={`${p.date} ${p.result} ${p.pick}`}
                  />
                );
              })}
            </div>

            <div className="text-xs text-gray-500">
              Legend: <span className="text-emerald-400">W</span>, <span className="text-red-400">L</span>,{' '}
              <span className="text-gray-300">P</span>, <span className="text-gray-400">PENDING</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Profit by Sport</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitBySport} layout="vertical" margin={{ left: 24, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis type="number" stroke="rgba(255,255,255,.45)" tickFormatter={(v) => fmtUnits(Number(v))} />
                <YAxis type="category" dataKey="sport" stroke="rgba(255,255,255,.45)" width={90} />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }} />
                <Bar dataKey="units" name="Units" radius={[6, 6, 6, 6]}>
                  {profitBySport.map((row) => (
                    <Cell key={row.sport} fill={row.units >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Confidence vs Outcome</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis
                  type="number"
                  dataKey="confidence"
                  domain={[0, 10]}
                  stroke="rgba(255,255,255,.45)"
                  tickCount={6}
                />
                <YAxis
                  type="number"
                  dataKey="units"
                  stroke="rgba(255,255,255,.45)"
                  tickFormatter={(v) => fmtUnits(Number(v))}
                />
                <Tooltip
                  contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }}
                  formatter={(v: any, name: any, ctx: any) => {
                    if (name === 'units') return [fmtUnits(Number(v)), 'Units'];
                    if (name === 'confidence') return [Number(v).toFixed(1), 'Confidence'];
                    return [v, name];
                  }}
                  labelFormatter={(_, payload: any) => {
                    const p = payload?.[0]?.payload;
                    if (!p) return '';
                    return `${p.date} • ${p.result}`;
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />

                <Scatter data={confidenceVsOutcome} name="Picks">
                  {confidenceVsOutcome.map((d) => {
                    const r = d.result;
                    const fill = r === 'W' ? '#22c55e' : r === 'L' ? '#ef4444' : r === 'P' ? '#94a3b8' : 'transparent';
                    const stroke = r === 'PENDING' ? 'rgba(148,163,184,.8)' : 'transparent';
                    return <Cell key={d.id} fill={fill} stroke={stroke} strokeWidth={2} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-500">Hover a point to see the pick.</div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
          <div className="mb-3 text-sm font-semibold">Cost vs Profit</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" />
                <XAxis
                  type="number"
                  dataKey="cost"
                  stroke="rgba(255,255,255,.45)"
                  tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
                />
                <YAxis
                  type="number"
                  dataKey="units"
                  stroke="rgba(255,255,255,.45)"
                  tickFormatter={(v) => fmtUnits(Number(v))}
                />
                <Tooltip
                  contentStyle={{ background: 'rgba(17,24,39,.95)', border: '1px solid rgba(255,255,255,.08)' }}
                  formatter={(v: any, name: any) => {
                    if (name === 'cost') return [`$${Number(v).toFixed(4)}`, 'Cost'];
                    if (name === 'units') return [fmtUnits(Number(v)), 'Units'];
                    return [v, name];
                  }}
                  labelFormatter={(_, payload: any) => {
                    const p = payload?.[0]?.payload;
                    if (!p) return '';
                    return `${p.date} • ${p.result} • ${p.label}`;
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />

                <Scatter data={costVsProfit} name="Picks">
                  {costVsProfit.map((d) => {
                    const r = d.result;
                    const fill = r === 'W' ? '#22c55e' : r === 'L' ? '#ef4444' : r === 'P' ? '#94a3b8' : 'transparent';
                    const stroke = r === 'PENDING' ? 'rgba(148,163,184,.8)' : 'transparent';
                    return <Cell key={d.id} fill={fill} stroke={stroke} strokeWidth={2} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-500">Does spending more compute correlate with better outcomes?</div>
        </div>
      </div>

    </div>
  );
}
