import { sampleCards } from '../data/sample';
import { PickTable } from '../components/PickTable';

export default function History() {
  const picks = sampleCards.flatMap((c) => c.picks);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-glow">
        <div className="text-3xl font-extrabold tracking-tight">Pick History</div>
        <div className="mt-1 text-sm text-gray-400">Filterable pick list (sample data). In the real system this would read from Postgres/CSV/JSONL.</div>
      </div>
      <PickTable picks={picks} />
    </div>
  );
}
