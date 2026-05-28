import { useEffect, useMemo, useState } from 'react';
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

  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (!loading && !error) setFetchedAt(new Date());
  }, [loading, error, allPicks.length]);

  function fmtEtDateTime(d: Date) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  function fmtEtDate(yyyyMmDd: string) {
    const m = /^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd) ? yyyyMmDd : '';
    if (!m) return yyyyMmDd;
    const d = new Date(`${m}T00:00:00Z`);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  const totals = useMemo(() => summarize(allPicks), [allPicks]);
  const wr = useMemo(() => winRate(totals), [totals]);
  const r = useMemo(() => roi(totals, allPicks), [totals, allPicks]);

  const trackingSince = useMemo(() => {
    const dates = allPicks.map((p) => p.date).filter(Boolean);
    if (!dates.length) return null;
    return dates.slice().sort()[0];
  }, [allPicks]);

  const sportsCount = useMemo(() => {
    const leagueToSport: Record<string, string> = {
      NBA: 'Basketball',
      WNBA: 'Basketball',
      NCAAB: 'Basketball',
      MLB: 'Baseball',
      NHL: 'Hockey',
      NFL: 'Football',
    };
    const sports = new Set<string>();
    for (const p of allPicks) {
      const league = String((p as any).league || '').trim();
      const sport = leagueToSport[league] || league || 'Unknown';
      if (sport) sports.add(sport);
    }
    return sports.size;
  }, [allPicks]);

  const last10 = useMemo(() => {
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

    const recent = sorted.filter((p) => p.result !== 'PENDING').slice(-10);
    const w = recent.filter((p) => p.result === 'W').length;
    const l = recent.filter((p) => p.result === 'L').length;
    const p = recent.filter((p) => p.result === 'P').length;
    return { w, l, p };
  }, [allPicks]);

  const streak = useMemo(() => {
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

    const recent = sorted.filter((p) => p.result !== 'PENDING');
    if (!recent.length) return { label: '—', tone: 'neutral' as const };

    const last = recent[recent.length - 1].result;
    if (last !== 'W' && last !== 'L') return { label: '—', tone: 'neutral' as const };

    let n = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].result === last) n++;
      else break;
    }

    return { label: `${last}${n}`, tone: last === 'W' ? ('good' as const) : ('bad' as const) };
  }, [allPicks]);

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
    <div className="space-y-6">
      <div className="text-xs text-muted opacity-80">
        Last updated: {fetchedAt ? fmtEtDateTime(fetchedAt) : '—'}
        <span className="px-2">·</span>
        {allPicks.length} picks tracked
        <span className="px-2">·</span>
        {sportsCount} sports
        <span className="px-2">·</span>
        tracking since {trackingSince ? fmtEtDate(trackingSince) : '—'}
      </div>

      <div className="rounded-md border border-border bg-card p-5">
        <div className="text-3xl font-extrabold tracking-tight">Overview</div>
        <div className="mt-1 text-sm text-muted">High-level KPIs, MTD performance, and trend snapshots (sample data).</div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <KpiCard label="Record" value={`${totals.wins}-${totals.losses}-${totals.pushes}`} sub={`${totals.pending} pending`} />
        <KpiCard label="Win Rate" value={fmtPct(wr)} />
        <KpiCard label="ROI" value={fmtPct(r)} tone={r >= 0 ? 'good' : 'bad'} />
        <KpiCard label="Units Net" value={fmtUnits(totals.unitsNet)} tone={totals.unitsNet >= 0 ? 'good' : 'bad'} />
        <KpiCard
          label="Recent Streak"
          value={`Last 10: ${last10.w}-${last10.l}`}
          sub={`Streak: ${streak.label}${last10.p ? ` • ${last10.p} push` : ''}`}
          tone={streak.tone}
        />
      </div>

      <div className="text-xs font-semibold uppercase tracking-widest text-muted opacity-80">Performance</div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Cumulative Units (running total)</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeByDay} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="#262C34" />
                <XAxis dataKey="dateLabel" stroke="#8B949E" />
                <YAxis stroke="#8B949E" />
                <Tooltip
                  contentStyle={{ background: '#161A1F', border: '1px solid #262C34' }}
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
                <ReferenceLine y={0} stroke="#8B949E" strokeDasharray="4 4" />

                <Area type="monotone" dataKey="cumPos" stroke="none" fill="rgba(0,210,106,.18)" dot={false} />
                <Area type="monotone" dataKey="cumNeg" stroke="none" fill="rgba(255,71,87,.18)" dot={false} />
                <Line type="monotone" dataKey="cumUnits" stroke="#00D26A" strokeWidth={3} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Recent Form</div>
          <div className="flex h-72 flex-col justify-between">
            <div className="text-sm text-muted">Most recent {recentForm.length} picks</div>
            <div className="flex flex-wrap items-center gap-2">
              {recentForm.map((p) => {
                const r = p.result;
                const base = 'h-3 w-3 rounded-sm';
                const cls =
                  r === 'W'
                    ? `${base} bg-accent`
                    : r === 'L'
                      ? `${base} bg-loss`
                      : r === 'P'
                        ? `${base} bg-muted`
                        : `${base} border border-border bg-transparent`;

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

            <div className="text-xs text-muted">
              Legend: <span className="font-bold text-accent">W</span>, <span className="font-bold text-loss">L</span>,{' '}
              <span className="font-bold text-muted">P</span>, <span className="font-bold text-pending">PENDING</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-widest text-muted opacity-80">Breakdowns</div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4 flex flex-col min-h-[360px]">
          <div className="mb-3 text-sm font-semibold">Profit by Sport</div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitBySport} layout="vertical" margin={{ left: 24, right: 8 }}>
                <CartesianGrid stroke="#262C34" />
                <XAxis type="number" stroke="#8B949E" tickFormatter={(v) => fmtUnits(Number(v))} />
                <YAxis type="category" dataKey="sport" stroke="#8B949E" width={90} />
                <Tooltip contentStyle={{ background: '#161A1F', border: '1px solid #262C34' }} />
                <Bar dataKey="units" name="Units" radius={[6, 6, 6, 6]}>
                  {profitBySport.map((row) => (
                    <Cell key={row.sport} fill={row.units >= 0 ? '#00D26A' : '#FF4757'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4 flex flex-col min-h-[360px]">
          <div className="mb-3 text-sm font-semibold">Confidence vs Outcome</div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid stroke="#262C34" />
                <XAxis
                  type="number"
                  dataKey="confidence"
                  domain={[0, 10]}
                  stroke="#8B949E"
                  tickCount={6}
                />
                <YAxis
                  type="number"
                  dataKey="units"
                  stroke="#8B949E"
                  tickFormatter={(v) => fmtUnits(Number(v))}
                />
                <Tooltip
                  contentStyle={{ background: '#161A1F', border: '1px solid #262C34' }}
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
                <ReferenceLine y={0} stroke="#8B949E" strokeDasharray="4 4" />

                <Scatter data={confidenceVsOutcome} name="Picks">
                  {confidenceVsOutcome.map((d) => {
                    const r = d.result;
                    const fill = r === 'W' ? '#00D26A' : r === 'L' ? '#FF4757' : r === 'P' ? '#8B949E' : 'transparent';
                    const stroke = r === 'PENDING' ? '#FFB020' : 'transparent';
                    return <Cell key={d.id} fill={fill} stroke={stroke} strokeWidth={2} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted">Hover a point to see the pick.</div>
        </div>

        <div className="rounded-md border border-border bg-card p-4 flex flex-col min-h-[360px]">
          <div className="mb-3 text-sm font-semibold">Cost vs Profit</div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid stroke="#262C34" />
                <XAxis
                  type="number"
                  dataKey="cost"
                  stroke="#8B949E"
                  tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
                />
                <YAxis
                  type="number"
                  dataKey="units"
                  stroke="#8B949E"
                  tickFormatter={(v) => fmtUnits(Number(v))}
                />
                <Tooltip
                  contentStyle={{ background: '#161A1F', border: '1px solid #262C34' }}
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
                <ReferenceLine y={0} stroke="#8B949E" strokeDasharray="4 4" />

                <Scatter data={costVsProfit} name="Picks">
                  {costVsProfit.map((d) => {
                    const r = d.result;
                    const fill = r === 'W' ? '#00D26A' : r === 'L' ? '#FF4757' : r === 'P' ? '#8B949E' : 'transparent';
                    const stroke = r === 'PENDING' ? '#FFB020' : 'transparent';
                    return <Cell key={d.id} fill={fill} stroke={stroke} strokeWidth={2} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted">Does spending more compute correlate with better outcomes?</div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted leading-relaxed">
        Picks are generated daily by an AI agent, posted to Discord, auto-graded against official league APIs (MLB/NBA/NHL), and tracked here in real time.
        ROI on compute = units of profit per dollar of AI spend.
      </div>

    </div>
  );
}
