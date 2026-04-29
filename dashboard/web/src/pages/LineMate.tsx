import { sampleCards } from '../data/sample';
import { fmtOdds } from '../lib/format';

const picks = sampleCards.flatMap(c => c.picks).filter(p => p.lineMate);

export default function LineMate() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-3xl font-extrabold tracking-tight">LineMate / Odds Movement</div>
        <div className="mt-1 text-sm text-gray-400">Opening → pick-time → closing snapshots (sample).</div>
      </div>

      <div className="grid gap-4">
        {picks.map(p => (
          <div key={p.id} className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm text-gray-400">{p.date} • {p.league} • {p.betType}</div>
                <div className="text-lg font-extrabold">{p.matchup}</div>
                <div className="mt-1 text-sm font-semibold">{p.pick} ({fmtOdds(p.oddsAtPick.odds)})</div>
              </div>
              <div className="text-xs text-gray-400">{p.lineMate?.status.toUpperCase()}</div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {p.lineMate?.opening ? (
                <div className="rounded-xl border border-border bg-black/20 p-3">
                  <div className="text-xs text-gray-400">Opening</div>
                  <div className="mt-1 text-sm font-semibold">{p.lineMate.opening.line} ({fmtOdds(p.lineMate.opening.odds)})</div>
                  <div className="text-xs text-gray-500">{p.lineMate.opening.ts}</div>
                </div>
              ) : null}
              <div className="rounded-xl border border-border bg-black/20 p-3">
                <div className="text-xs text-gray-400">At Pick</div>
                <div className="mt-1 text-sm font-semibold">{p.oddsAtPick.line} ({fmtOdds(p.oddsAtPick.odds)})</div>
                <div className="text-xs text-gray-500">{p.oddsAtPick.ts}</div>
              </div>
              {p.lineMate?.closing ? (
                <div className="rounded-xl border border-border bg-black/20 p-3">
                  <div className="text-xs text-gray-400">Closing</div>
                  <div className="mt-1 text-sm font-semibold">{p.lineMate.closing.line} ({fmtOdds(p.lineMate.closing.odds)})</div>
                  <div className="text-xs text-gray-500">{p.lineMate.closing.ts}</div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 text-sm text-gray-300">{p.lineMate?.notes}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
