// "Last updated" indicator shown above the dashboard.
// Reveals the per-source freshness on hover/click via a <details> drawer.

import type { Freshness } from '@/lib/freshness';
import { relativeDate } from '@/lib/utils';

function statusPill(status: string) {
  const styles: Record<string, string> = {
    ok: 'bg-green-100 text-green-700',
    pending: 'bg-amber-50 text-amber-700',
    error: 'bg-red-100 text-red-700',
    unconfigured: 'bg-slate-100 text-slate-500',
    connected: 'bg-green-100 text-green-700'
  };
  return styles[status] ?? 'bg-slate-100 text-slate-600';
}

function fmtAbs(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtRel(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return relativeDate(iso);
}

export default function FreshnessBar({ freshness }: { freshness: Freshness }) {
  const ts = freshness.overall_last_updated_at;
  const hue = ts && (Date.now() - new Date(ts).getTime() < 12 * 3600 * 1000)
    ? 'bg-green-100 text-green-800'
    : ts ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600';

  return (
    <details className="card">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <div className="flex items-center gap-3">
          <span className={`pill ${hue}`}>
            <span className="inline-block w-2 h-2 rounded-full bg-current mr-2 opacity-60" />
            Last updated {fmtRel(ts)}
          </span>
          <span className="text-xs text-slate-500">
            GSC data through {freshness.gsc_last_date ?? '—'} · syncs nightly
          </span>
        </div>
        <span className="text-xs text-slate-500 select-none">data sources ▾</span>
      </summary>
      <div className="mt-3 grid sm:grid-cols-2 gap-2">
        {freshness.sources.map(s => (
          <div key={s.name} className="border border-slate-200 rounded-md px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{s.name}</div>
              <span className={`pill text-[10px] ${statusPill(s.status)}`}>{s.status}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {s.cadence} · last {fmtRel(s.last)}
              <span className="text-slate-400 ml-1">({fmtAbs(s.last)})</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Everything refreshes automatically. GSC has a built-in 2-day lag; lead and WordPress data is near-real-time.
      </p>
    </details>
  );
}
