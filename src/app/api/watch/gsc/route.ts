// Runs the GSC delta watcher AFTER the nightly GSC sync has pulled fresh data.
// Vercel cron schedules this 30 min after /api/sync/gsc.

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { watchGsc } from '@/lib/gsc-watcher';

async function run(req: NextRequest) {
  const token = req.headers.get('x-api-token') ?? new URL(req.url).searchParams.get('token');
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const { data: clients } = await supabase.from('clients').select('id');
  const results: any[] = [];
  for (const c of clients ?? []) {
    try {
      const r = await watchGsc(c.id);
      results.push({ client_id: c.id, ...r });
    } catch (err: any) {
      results.push({ client_id: c.id, error: err.message });
    }
  }
  return NextResponse.json({ ok: true, results });
}
export const GET = run;
export const POST = run;
