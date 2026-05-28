import { PickTable } from '../components/PickTable';
import { usePicks } from '../lib/usePicks';

export default function History() {
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
        <div className="text-3xl font-extrabold tracking-tight">Pick History</div>
        <div className="mt-1 text-sm text-muted">Filterable pick list (sample data). In the real system this would read from Postgres/CSV/JSONL.</div>
      </div>
      <PickTable picks={picks} />
    </div>
  );
}
