// Runs the WordPress watcher across every client that has WP credentials set.
// Vercel cron: every 30 min.

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { watchWordpress } from '@/lib/wp-watcher';

async function run(req: NextRequest) {
  const token = req.headers.get('x-api-token') ?? new URL(req.url).searchParams.get('token');
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();

  // any client that has a wp_base_url + app_user + app_pass on an integration row
  const { data: integrations } = await supabase
    .from('integrations')
    .select('client_id, config, credentials')
    .in('kind', ['elementor','wordpress' as any]);

  const eligible = (integrations ?? []).filter(i =>
    (i.config as any)?.wp_base_url &&
    (i.credentials as any)?.app_user &&
    (i.credentials as any)?.app_pass
  );

  const results: any[] = [];
  for (const i of eligible) {
    try {
      const r = await watchWordpress(i.client_id);
      results.push({ client_id: i.client_id, ...r });
    } catch (err: any) {
      results.push({ client_id: i.client_id, error: err.message });
      await supabase.from('watcher_run').upsert({
        client_id: i.client_id, watcher: 'wp',
        last_run_at: new Date().toISOString(), last_status: 'error',
        last_detail: { error: err.message }
      }, { onConflict: 'client_id,watcher' });
    }
  }
  return NextResponse.json({ ok: true, results });
}
export const GET = run;
export const POST = run;
