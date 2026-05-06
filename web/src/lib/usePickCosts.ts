import { useEffect, useMemo, useState } from 'react';

type PickCostRow = {
  pick_id?: string;
  cost_usd?: number;
};

function isDemoMode(): boolean {
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('demo') === '1';
  } catch {
    return false;
  }
}

function getApiBase(): string {
  // Prefer explicit env var; otherwise rely on Vite proxy with relative /api.
  return (import.meta as any).env?.VITE_API_BASE_URL ? String((import.meta as any).env.VITE_API_BASE_URL) : '';
}

export function usePickCosts() {
  const demo = isDemoMode();
  const [rows, setRows] = useState<PickCostRow[]>([]);
  const [loading, setLoading] = useState<boolean>(!demo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (demo) {
        setLoading(false);
        setError(null);
        setRows([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/pick_costs`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? (data as PickCostRow[]) : [];
        if (!cancelled) setRows(arr);
      } catch (e: any) {
        if (!cancelled) {
          setRows([]);
          setError(e?.message ? String(e.message) : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [demo]);

  const costsByPickId = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of rows) {
      const id = String(r.pick_id || '').trim();
      if (!id) continue;
      const cost = Number(r.cost_usd);
      if (!Number.isFinite(cost)) continue;
      out[id] = cost;
    }
    return out;
  }, [rows]);

  return { costsByPickId, loading, error, demo };
}
