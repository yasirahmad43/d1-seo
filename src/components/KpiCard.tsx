import { fmtInt, fmtPct, trendArrow } from '@/lib/utils';

type Props = {
  label: string;
  value: number | string | null;
  prev?: number | null;
  format?: 'int' | 'pct' | 'raw';
};

export default function KpiCard({ label, value, prev, format = 'int' }: Props) {
  const display =
    value == null ? '—' :
    format === 'pct' ? fmtPct(Number(value)) :
    format === 'raw' ? String(value) :
    fmtInt(Number(value));

  const arrow =
    typeof value === 'number' && prev != null
      ? trendArrow(Number(value), Number(prev))
      : null;

  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi mt-1">{display}</div>
      {arrow && (
        <div className={`text-xs mt-1 ${arrow.color}`}>
          {arrow.glyph} {arrow.pct} vs prev. period
        </div>
      )}
    </div>
  );
}
