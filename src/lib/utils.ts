export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null) return '—';
  return `${(Number(n) * 100).toFixed(digits)}%`;
}

export function fmtPosition(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number(n).toFixed(1);
}

export function trendArrow(curr: number, prev: number): { glyph: string; color: string; pct: string } {
  if (!prev) return { glyph: '–', color: 'text-gray-500', pct: '' };
  const delta = (curr - prev) / prev;
  const pct = `${(delta * 100).toFixed(0)}%`;
  if (delta > 0.02) return { glyph: '▲', color: 'text-green-600', pct };
  if (delta < -0.02) return { glyph: '▼', color: 'text-red-600', pct };
  return { glyph: '–', color: 'text-gray-500', pct };
}

export function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString();
}
