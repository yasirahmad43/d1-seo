'use client';
// Count-up KPI display.
// IMPORTANT: accept format as a string TOKEN, not a function — server→client
// function props break Next.js's RSC boundary. This is the same lesson that
// bit us in d1app's DashboardHome on first refactor.

import { useEffect, useRef, useState } from 'react';

type Format = 'number' | 'usd' | 'usd-cents' | 'pct';

function fmt(n: number, format: Format): string {
  if (format === 'usd')       return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  if (format === 'usd-cents') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  if (format === 'pct')       return `${(n * 100).toFixed(1)}%`;
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export default function AnimatedCounter({
  value, format = 'number', durationMs = 800, className = ''
}: { value: number; format?: Format; durationMs?: number; className?: string }) {
  const [n, setN] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    // honor reduced motion
    const reduce = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setN(value); return; }
    if (startedRef.current) { setN(value); return; }
    startedRef.current = true;
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);   // easeOutCubic
      setN(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={`tabular-nums ${className}`}>{fmt(n, format)}</span>;
}
