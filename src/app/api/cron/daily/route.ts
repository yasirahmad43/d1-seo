// Combined daily cron — Vercel Hobby allows only 2 crons, so we batch all
// data-pulls into one endpoint: GSC + GA4 + WP. The GSC delta watcher runs
// from a separate cron (also daily, scheduled 30 min later so it sees fresh
// GSC data). For sub-daily polling, point cron-job.org at /api/sync/wp.

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { syncGscForClient } from '@/lib/gsc';
import { syncGa4ForClient } from '@/lib/ga4';
import { watchWordpress } from '@/lib/wp-watcher';

async function run(req: NextRequest) {
  const token = req.headers.get('x-api-token') ?? new URL(req.url).searchParams.get('token');
  // Vercel cron sends its own bearer; accept either auth method.
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron');
  if (!isVercelCron && (!token || token !== process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const out: any = { gsc: [], ga4: [], wp: [] };

  // --- GSC ---
  const { data: gscRows } = await supabase
    .from('integrations')
    .select('client_id, config, status').eq('kind', 'gsc').in('status', ['connected','pending']);
  for (const i of gscRows ?? []) {
    const siteUrl = (i.config as any)?.site_url;
    if (!siteUrl) { out.gsc.push({ client_id: i.client_id, skipped: 'no site_url' }); continue; }
    try { out.gsc.push({ client_id: i.client_id, ...(await syncGscForClient(i.client_id, siteUrl)) }); }
    catch (e: any) { out.gsc.push({ client_id: i.client_id, error: e.message }); }
  }

  // --- GA4 ---
  const { data: ga4Rows } = await supabase
    .from('integrations')
    .select('client_id, config, status').eq('kind', 'ga4').in('status', ['connected','pending']);
  for (const i of ga4Rows ?? []) {
    const propertyId = (i.config as any)?.property_id;
    if (!propertyId) { out.ga4.push({ client_id: i.client_id, skipped: 'no property_id' }); continue; }
    try { out.ga4.push({ client_id: i.client_id, ...(await syncGa4ForClient(i.client_id, propertyId)) }); }
    catch (e: any) { out.ga4.push({ client_id: i.client_id, error: e.message }); }
  }

  // --- WP ---
  const { data: wpRows } = await supabase
    .from('integrations')
    .select('client_id, config, credentials').in('kind', ['elementor','wordpress' as any]);
  const wpEligible = (wpRows ?? []).filter(i =>
    (i.config as any)?.wp_base_url && (i.credentials as any)?.app_user && (i.credentials as any)?.app_pass);
  for (const i of wpEligible) {
    try { out.wp.push({ client_id: i.client_id, ...(await watchWordpress(i.client_id)) }); }
    catch (e: any) { out.wp.push({ client_id: i.client_id, error: e.message }); }
  }

  return NextResponse.json({ ok: true, ...out });
}
export const GET = run;
export const POST = run;
