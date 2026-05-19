import { createSupabaseServerClient } from '@/lib/supabase/server';
import KpiCard from '@/components/KpiCard';
import ChangelogFeed from '@/components/ChangelogFeed';
import LeadTable from '@/components/LeadTable';
import KeywordTable from '@/components/KeywordTable';
import PagePerfTable from '@/components/PagePerfTable';
import { notFound } from 'next/navigation';

export default async function ClientDetail({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: client } = await supabase.from('clients').select('*').eq('id', params.id).single();
  if (!client) notFound();

  const [{ data: kpi }, { data: baseline }, { data: changelog }, { data: leads }, { data: keywords }, { data: pages }] = await Promise.all([
    supabase.from('v_kpi_periods').select('*').eq('client_id', client.id).maybeSingle(),
    supabase.from('baseline_snapshot').select('*').eq('client_id', client.id).maybeSingle(),
    supabase.from('changelog').select('*').eq('client_id', client.id).order('occurred_at', { ascending: false }).limit(20),
    supabase.from('leads').select('*').eq('client_id', client.id).order('submitted_at', { ascending: false }).limit(20),
    supabase.from('gsc_query_daily').select('query, impressions, clicks, avg_position').eq('client_id', client.id).order('impressions', { ascending: false }).limit(20),
    supabase.from('gsc_page_daily').select('page_url, impressions, clicks, avg_position').eq('client_id', client.id).order('impressions', { ascending: false }).limit(20)
  ]);

  const trackedQueries = (keywords ?? []).map((k: any) => ({
    query: k.query, intent: 'tracked', impressions: k.impressions, clicks: k.clicks, avg_position: k.avg_position
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <a className="text-sm text-brand hover:underline" href={client.website ?? '#'}>{client.website}</a>
        </div>
        <div className="text-sm text-slate-500">
          Engaged: {client.engagement_started ?? '—'}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Impressions (28d)" value={kpi?.impressions_28d ?? 0} prev={kpi?.impressions_90d ? Math.round(Number(kpi.impressions_90d)/3) : null} />
        <KpiCard label="Clicks (28d)"      value={kpi?.clicks_28d ?? 0}      prev={kpi?.clicks_90d ? Math.round(Number(kpi.clicks_90d)/3) : null} />
        <KpiCard label="Avg position (28d)" value={kpi?.avg_pos_28d ? Number(kpi.avg_pos_28d).toFixed(1) : '—'} format="raw" />
        <KpiCard label="Indexed pages"     value={(pages ?? []).length} />
      </section>

      {baseline && (
        <section className="card">
          <h2 className="font-semibold mb-2">Day-1 baseline ({baseline.captured_on})</h2>
          <pre className="text-xs bg-slate-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(baseline.metrics, null, 2)}
          </pre>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Recent changelog</h2>
        <ChangelogFeed entries={(changelog ?? []) as any} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Latest leads</h2>
        <LeadTable leads={(leads ?? []) as any} />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Top queries</h2>
          <KeywordTable rows={trackedQueries as any} />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Top pages</h2>
          <PagePerfTable rows={(pages ?? []) as any} />
        </div>
      </section>
    </div>
  );
}
