// Computes the dashboard's "last updated" status from watcher_run, gsc_daily_snapshot,
// and the latest lead. Used by the FreshnessBar on the client overview.

import { createSupabaseServerClient } from './supabase/server';

export type Freshness = {
  overall_last_updated_at: string | null;     // most recent of all data sources
  gsc_last_date: string | null;               // most recent GSC date we have
  gsc_last_sync_at: string | null;            // when our nightly sync ran
  wp_last_run_at: string | null;              // when WP watcher last ran
  wp_status: 'ok' | 'error' | 'unconfigured' | 'pending';
  ga4_last_sync_at: string | null;
  latest_lead_at: string | null;
  // Human-readable "what's pulling and how often"
  sources: Array<{ name: string; cadence: string; last: string | null; status: string }>;
};

export async function getClientFreshness(clientId: string): Promise<Freshness> {
  const supabase = createSupabaseServerClient();

  const [{ data: runs }, { data: gscMax }, { data: integ }, { data: leadMax }] = await Promise.all([
    supabase.from('watcher_run').select('watcher, last_run_at, last_status').eq('client_id', clientId),
    supabase.from('gsc_daily_snapshot').select('date').eq('client_id', clientId).order('date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('integrations').select('kind, last_sync_at, status').eq('client_id', clientId),
    supabase.from('leads').select('submitted_at').eq('client_id', clientId).order('submitted_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  const runByName: Record<string, any> = {};
  for (const r of runs ?? []) runByName[r.watcher] = r;
  const integByKind: Record<string, any> = {};
  for (const i of integ ?? []) integByKind[i.kind] = i;

  const wp_last_run_at = runByName.wp?.last_run_at ?? null;
  const wp_status: Freshness['wp_status'] =
    !wp_last_run_at ? (integByKind.elementor ? 'pending' : 'unconfigured') :
    runByName.wp?.last_status === 'ok' ? 'ok' : 'error';

  const gsc_last_sync_at = integByKind.gsc?.last_sync_at ?? null;
  const ga4_last_sync_at = integByKind.ga4?.last_sync_at ?? null;
  const gsc_last_date = gscMax?.date ?? null;
  const latest_lead_at = leadMax?.submitted_at ?? null;

  const candidates = [wp_last_run_at, gsc_last_sync_at, ga4_last_sync_at, latest_lead_at].filter(Boolean) as string[];
  const overall_last_updated_at = candidates.length
    ? candidates.sort().reverse()[0]
    : null;

  const sources = [
    {
      name: 'WordPress (pages, leads, snippets)',
      cadence: 'every 30 min',
      last: wp_last_run_at,
      status: wp_status
    },
    {
      name: 'Google Search Console',
      cadence: 'nightly',
      last: gsc_last_sync_at,
      status: integByKind.gsc?.status ?? 'unconfigured'
    },
    {
      name: 'Google Analytics 4',
      cadence: 'nightly',
      last: ga4_last_sync_at,
      status: integByKind.ga4?.status ?? 'unconfigured'
    },
    {
      name: 'Lead webhook',
      cadence: 'real-time',
      last: latest_lead_at,
      status: latest_lead_at ? 'ok' : 'unconfigured'
    }
  ];

  return {
    overall_last_updated_at,
    gsc_last_date,
    gsc_last_sync_at,
    wp_last_run_at,
    wp_status,
    ga4_last_sync_at,
    latest_lead_at,
    sources
  };
}
