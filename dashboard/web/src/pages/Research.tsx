import { sampleCards } from '../data/sample';
import { confidenceLabel } from '../lib/format';

const picks = sampleCards.flatMap(c => c.picks);

export default function Research() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-3xl font-extrabold tracking-tight">AI Research Logs</div>
        <div className="mt-1 text-sm text-gray-400">Concise research summary attached to each pick (sample).</div>
      </div>

      <div className="grid gap-4">
        {picks.map(p => {
          const tag = confidenceLabel(p.confidence);
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-gray-400">{p.date} • {p.league} • {p.startTimeET} ET</div>
                  <div className="text-lg font-extrabold">{p.matchup}</div>
                  <div className="mt-1 text-sm font-semibold">{p.pick}</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${tag.cls}`}>{tag.label} • {p.confidence.toFixed(1)}/10</div>
              </div>
              <div className="mt-3 text-sm text-gray-300 leading-relaxed">{p.researchSummary}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
