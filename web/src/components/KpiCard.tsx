import { ReactNode } from 'react';

export function KpiCard(props: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const toneCls =
    props.tone === 'good'
      ? 'text-accent'
      : props.tone === 'bad'
        ? 'text-loss'
        : 'text-text';

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className={`mt-2 text-3xl font-extrabold tabular-nums ${toneCls}`}>{props.value}</div>
      {props.sub ? <div className="mt-2 text-xs text-muted">{props.sub}</div> : null}
    </div>
  );
}
