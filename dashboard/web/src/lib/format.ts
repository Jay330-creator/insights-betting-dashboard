export function fmtPct(x: number, digits = 1) {
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtOdds(american: number) {
  return american > 0 ? `+${american}` : `${american}`;
}

export function fmtUnits(x: number) {
  const sign = x > 0 ? '+' : '';
  return `${sign}${x.toFixed(2)}u`;
}

export function confidenceLabel(c: number) {
  if (c >= 7.5) return { label: 'Strong', cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' };
  if (c >= 7.0) return { label: 'Lean', cls: 'bg-sky-500/15 text-sky-200 border-sky-500/30' };
  return { label: 'Low', cls: 'bg-amber-500/15 text-amber-200 border-amber-500/30' };
}
