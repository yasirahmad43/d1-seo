import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveClientId } from '@/lib/active-client';
import KpiCard from '@/components/KpiCard';
import ChangelogFeed from '@/components/ChangelogFeed';
import LeadTable from '@/components/LeadTable';

export default async function DashboardOverview({ searchParams }: { searchParams: { client?: string } }) {
  const clientId = await resolveActiveClientId(searchParams);
  if (!clientId) return <p className="text-sm text-slate-400">No client assigned yet. Ask your D1 Tech Creative contact.</p>;
  const supabase = createSupabaseServerClient();
  const [{ data: client }, { data: kpi }, { data: changelog }, { data: leads }] = await Promise.all([
    supabase.from('clients').select('name').eq('id', clientId).maybeSingle(),
    supabase.from('v_kpi_periods').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('changelog').select('id, occurred_at, kind, title, description, related_url').eq('client_id', clientId).eq('client_visible', true).order('occurred_at', { ascending: false }).limit(8),
    supabase.from('leads').select('*').eq('client_id', clientId).order('submitted_at', { ascending: false }).limit(8)
  ]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">SEO progress overview</h1>
        <p className="text-sm text-slate-400">{client?.name ?? 'Your SEO journey'} — what changed, what improved, what is coming next.</p>
      </header>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Impressions 7d" value={kpi?.impressions_7d ?? 0} />
        <KpiCard label="Impressions 28d" value={kpi?.impressions_28d ?? 0} />
        <KpiCard label="Clicks 28d" value={kpi?.clicks_28d ?? 0} />
        <KpiCard label="Avg position 28d" value={kpi?.avg_pos_28d ? Number(kpi.avg_pos_28d).toFixed(1) : '-'} format="raw" />
      </section>
      <section className="grid lg:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Recent work</h2>
          <ChangelogFeed entries={(changelog ?? []) as any} />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Latest leads</h2>
          <LeadTable leads={(leads ?? []) as any} />
        </div>
      </section>
    </div>
  );
}
