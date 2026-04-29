import { ReactNode } from 'react';

export function KpiCard(props: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const toneCls =
    props.tone === 'good'
      ? 'text-emerald-300'
      : props.tone === 'bad'
        ? 'text-rose-300'
        : 'text-gray-100';

  return (
    <div className="rounded-2xl border border-border bg-panel p-4 shadow-glow">
      <div className="text-xs font-semibold text-gray-400">{props.label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${toneCls}`}>{props.value}</div>
      {props.sub ? <div className="mt-2 text-xs text-gray-400">{props.sub}</div> : null}
    </div>
  );
}
