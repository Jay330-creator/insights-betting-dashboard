import { confidenceLabel } from '../lib/format';
import { usePicks } from '../lib/usePicks';

export default function Research() {
  const { picks, loading, error } = usePicks();

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
        <div className="text-3xl font-extrabold tracking-tight">AI Research Logs</div>
        <div className="mt-1 text-sm text-muted">Concise research summary attached to each pick (sample).</div>
      </div>

      <div className="grid gap-4">
        {picks.map(p => {
          const tag = confidenceLabel(p.confidence);
          return (
            <div key={p.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted">{p.date} • {p.league}{p.startTimeET ? ` • ${p.startTimeET} ET` : ''}</div>
                  <div className="text-lg font-extrabold">{p.matchup}</div>
                  <div className="mt-1 text-sm font-semibold">{p.pick}</div>
                </div>
                <div className={`rounded-md border bg-bg px-3 py-1 text-xs font-semibold tabular-nums ${tag.cls}`}>{tag.label} • {p.confidence.toFixed(1)}/10</div>
              </div>
              <div className="mt-3 text-sm text-text leading-relaxed">{p.researchSummary}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
