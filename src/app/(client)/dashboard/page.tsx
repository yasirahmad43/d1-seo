import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveClientId } from '@/lib/active-client';
import { getClientFreshness } from '@/lib/freshness';
import KpiCard from '@/components/KpiCard';
import SeoLeadsCard from '@/components/SeoLeadsCard';
import FreshnessBar from '@/components/FreshnessBar';
import ChangelogFeed from '@/components/ChangelogFeed';
import LeadTable from '@/components/LeadTable';
import WelcomeCard from '@/components/WelcomeCard';
import { fmtInt } from '@/lib/utils';

export default async function DashboardOverview({ searchParams }: { searchParams: { client?: string } }) {
  const clientId = await resolveActiveClientId(searchParams);
  if (!clientId) return <p className="text-sm text-slate-500">No client assigned yet. Ask your D1 Tech Creative contact.</p>;

  const supabase = createSupabaseServerClient();
  const since7  = new Date(Date.now() - 7  * 86400000).toISOString();
  const since28 = new Date(Date.now() - 28 * 86400000).toISOString();
  const since56 = new Date(Date.now() - 56 * 86400000).toISOString();

  const [{ data: kpi }, { data: baseline }, { data: changelog }, { data: leads }, { data: sourceMix }, freshness, { count: seo7d }, { count: seo28d }, { count: total28d }, { count: prevSeo28d }] = await Promise.all([
    supabase.from('v_kpi_periods').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('baseline_snapshot').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('changelog').select('id, occurred_at, kind, title, description, related_url').eq('client_id', clientId).eq('client_visible', true).order('occurred_at', { ascending: false }).limit(8),
    supabase.from('leads').select('*').eq('client_id', clientId).order('submitted_at', { ascending: false }).limit(8),
    supabase.from('v_lead_source_breakdown_28d').select('*').eq('client_id', clientId),
    getClientFreshness(clientId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('client_id', clientId).in('source_bucket', ['organic','ai']).gte('submitted_at', since7),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('client_id', clientId).in('source_bucket', ['organic','ai']).gte('submitted_at', since28),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('client_id', clientId).gte('submitted_at', since28),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('client_id', clientId).in('source_bucket', ['organic','ai']).gte('submitted_at', since56).lt('submitted_at', since28)
  ]);

  const baselineMetrics = (baseline?.metrics as any) ?? {};
  const baselineImpressions = baselineMetrics.impressions_90d ?? null;
  const baselineIndexed = baselineMetrics.pages_indexed ?? null;

  const { data: client } = await supabase.from('clients').select('name').eq('id', clientId).maybeSingle();

  return (
    <div className="space-y-6">
      <WelcomeCard name={client?.name} subtitle="Here's what's happening with your SEO." />

      <FreshnessBar freshness={freshness} />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SeoLeadsCard
          seo7d={seo7d ?? 0}
          seo28d={seo28d ?? 0}
          total28d={total28d ?? 0}
          prevSeo28d={prevSeo28d ?? 0}
        />
        <KpiCard label="Impressions · 28d" value={kpi?.impressions_28d ?? 0} />
        <KpiCard label="Clicks · 28d" value={kpi?.clicks_28d ?? 0} />
        <KpiCard label="Avg position · 28d" value={kpi?.avg_pos_28d ? Number(kpi.avg_pos_28d).toFixed(1) : '—'} format="raw" />
      </section>

      {baseline && (
        <section className="card">
          <h2 className="font-semibold mb-2">Where you started vs. where you are</h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="kpi-label">Pages indexed</div>
              <div>
                <span className="text-slate-500">{String(baselineIndexed ?? '—')}</span>
                <span className="mx-2">→</span>
                <span className="font-semibold">{freshness.gsc_last_date ? 'see Pages tab' : '—'}</span>
              </div>
            </div>
            <div>
              <div className="kpi-label">Impressions (90d)</div>
              <div>
                <span className="text-slate-500">{fmtInt(baselineImpressions)}</span>
                <span className="mx-2">→</span>
                <span className="font-semibold">{fmtInt(kpi?.impressions_