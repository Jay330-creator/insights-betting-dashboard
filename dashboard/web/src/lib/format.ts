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
  if (c >= 7.5) return { label: 'Strong', cls: 'border-accent text-accent' };
  if (c >= 7.0) return { label: 'Lean', cls: 'border-border text-text' };
  return { label: 'Low', cls: 'border-pending text-pending' };
}
