import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fmtInt } from '@/lib/utils';

export default async function AdminHomePage() {
  const supabase = createSupabaseServerClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, slug, website, engagement_started')
    .order('name');

  // pull 28-day KPI summaries for the dashboard row
  const ids = (clients ?? []).map(c => c.id);
  let kpi: Record<string, any> = {};
  if (ids.length) {
    const { data: rows } = await supabase
      .from('v_kpi_periods')
      .select('client_id, impressions_28d, clicks_28d, avg_pos_28d')
      .in('client_id', ids);
    for (const r of rows ?? []) kpi[r.client_id] = r;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clients</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(clients ?? []).map(c => (
          <Link key={c.id} href={`/admin/clients/${c.id}`} className="card hover:border-brand transition">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-slate-500">
                {c.engagement_started ? `since ${c.engagement_started}` : ''}
              </div>
            </div>
            <a href={c.website ?? '#'} className="text-xs text-brand hover:underline">{c.website}</a>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="kpi-label">28d impressions</div>
                <div className="font-semibold">{fmtInt(kpi[c.id]?.impressions_28d)}</div>
              </div>
              <div>
                <div className="kpi-label">28d clicks</div>
                <div className="font-semibold">{fmtInt(kpi[c.id]?.clicks_28d)}</div>
              </div>
              <div>
                <div className="kpi-label">avg pos</div>
                <div className="font-semibold">
                  {kpi[c.id]?.avg_pos_28d ? Number(kpi[c.id].avg_pos_28d).toFixed(1) : '—'}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
