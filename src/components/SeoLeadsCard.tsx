// "Leads from SEO" KPI — the most-asked client question, answered loudly.
// Pulls 7/28 day counts where source_bucket is in (organic, ai).

import { fmtInt } from '@/lib/utils';

type Props = {
  seo7d: number;
  seo28d: number;
  total28d: number;
  prevSeo28d?: number;
};

export default function SeoLeadsCard({ seo7d, seo28d, total28d, prevSeo28d }: Props) {
  const pct = total28d > 0 ? Math.round((seo28d / total28d) * 100) : 0;
  const delta = prevSeo28d != null && prevSeo28d > 0
    ? Math.round(((seo28d - prevSeo28d) / prevSeo28d) * 100)
    : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="kpi-label">Leads from SEO</div>
        <div className="text-xs text-slate-400">organic + AI search</div>
      </div>
      <div className="flex items-baseline gap-3 mt-1">
        <div className="kpi text-brand">{fmtInt(seo28d)}</div>
        <div className="text-xs text-slate-500">in last 28 days</div>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-slate-600">{seo7d} in last 7d</span>
        <span className="text-slate-600">{pct}% of total leads</span>
      </div>
      {delta != null && (
        <div className={`text-xs mt-1 ${delta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs previous 28 days
        </div>
      )}
    </div>
  );
}
