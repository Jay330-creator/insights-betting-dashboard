import { useEffect, useMemo, useState } from 'react';
import type { Pick } from '../data/sample';
import { demoCards } from '../data/demo';
import { adaptSupabasePicks } from './adaptSupabasePick';

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

export function usePicks() {
  const demo = isDemoMode();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState<boolean>(!demo);
  const [error, setError] = useState<string | null>(null);

  const demoPicks = useMemo(() => demoCards.flatMap((c) => c.picks), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (demo) {
        setLoading(false);
        setError(null);
        setPicks(demoPicks);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/picks`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await res.json();
        const adapted = adaptSupabasePicks(Array.isArray(rows) ? rows : []);
        if (!cancelled) setPicks(adapted);
      } catch (e: any) {
        if (!cancelled) {
          setPicks([]);
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
  }, [demo, demoPicks]);

  return { picks, loading, error, demo };
}
