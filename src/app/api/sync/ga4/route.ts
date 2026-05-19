import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { syncGa4ForClient } from '@/lib/ga4';

async function run(req: NextRequest) {
  const token = req.headers.get('x-api-token') ?? new URL(req.url).searchParams.get('token');
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const { data: integrations } = await supabase
    .from('integrations')
    .select('client_id, config, status')
    .eq('kind', 'ga4')
    .in('status', ['connected','pending']);

  const results: any[] = [];
  for (const i of integrations ?? []) {
    const propertyId = (i.config as any)?.property_id;
    if (!propertyId) { results.push({ client_id: i.client_id, skipped: 'no property_id' }); continue; }
    try {
      const r = await syncGa4ForClient(i.client_id, propertyId);
      results.push({ client_id: i.client_id, ...r });
    } catch (err: any) {
      await supabase.from('integrations')
        .update({ last_error: err.message ?? String(err), status: 'error' })
        .eq('client_id', i.client_id).eq('kind', 'ga4');
      results.push({ client_id: i.client_id, error: err.message });
    }
  }
  return NextResponse.json({ ok: true, results });
}
export const GET = run;
export const POST = run;
