// Nightly GSC sync — POST/GET /api/sync/gsc
// Vercel Cron entry: { path: "/api/sync/gsc", schedule: "0 9 * * *" }
//
// Auth: x-api-token must match CRON_SECRET.
// Iterates every connected GSC integration and pulls last 7 days of data.

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { syncGscForClient } from '@/lib/gsc';

async function run(req: NextRequest) {
  const token = req.headers.get('x-api-token') ?? new URL(req.url).searchParams.get('token');
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const { data: integrations } = await supabase
    .from('integrations')
    .select('client_id, config, status')
    .eq('kind', 'gsc')
    .in('status', ['connected','pending']);

  const results: any[] = [];
  for (const i of integrations ?? []) {
    const siteUrl = (i.config as any)?.site_url;
    if (!siteUrl) { results.push({ client_id: i.client_id, skipped: 'no site_url' }); continue; }
    try {
      const r = await syncGscForClient(i.client_id, siteUrl);
      results.push({ client_id: i.client_id, ...r });
    } catch (err: any) {
      await supabase.from('integrations')
        .update({ last_error: err.message ?? String(err), status: 'error' })
        .eq('client_id', i.client_id).eq('kind', 'gsc');
      results.push({ client_id: i.client_id, error: err.message });
    }
  }
  return NextResponse.json({ ok: true, results });
}
export const GET = run;
export const POST = run;
