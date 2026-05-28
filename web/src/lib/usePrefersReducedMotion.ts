import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const set = () => setReduced(Boolean(mq.matches));
    set();

    // Safari < 14
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', set);
      return () => mq.removeEventListener('change', set);
    }

    // @ts-expect-error older Safari
    mq.addListener(set);
    // @ts-expect-error older Safari
    return () => mq.removeListener(set);
  }, []);

  return reduced;
}

