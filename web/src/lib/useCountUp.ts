import { useEffect, useMemo, useRef, useState } from 'react';

type Easing = (t: number) => number;

const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);

export function useCountUp(
  target: number,
  opts?: {
    active?: boolean;
    durationMs?: number;
    delayMs?: number;
    easing?: Easing;
    decimals?: number;
  }
) {
  const {
    active = true,
    durationMs = 1200,
    delayMs = 0,
    easing = easeOutCubic,
    decimals,
  } = opts || {};

  const stableTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const rounded = useMemo(() => {
    if (!active) return stableTarget;
    if (typeof decimals === 'number') {
      const p = Math.pow(10, Math.max(0, decimals));
      return Math.round(value * p) / p;
    }
    return value;
  }, [active, stableTarget, value, decimals]);

  useEffect(() => {
    // Play once, when animation is first allowed.
    if (!active) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const startValue = 0;
    const startAt = performance.now() + Math.max(0, delayMs);
    const endAt = startAt + Math.max(1, durationMs);

    const tick = (now: number) => {
      if (now < startAt) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(1, (now - startAt) / (endAt - startAt));
      const k = easing(t);
      setValue(startValue + (stableTarget - startValue) * k);

      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, stableTarget, delayMs, durationMs, easing]);

  return rounded;
}
