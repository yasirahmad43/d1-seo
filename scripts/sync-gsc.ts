// One-off CLI: trigger the GSC sync for every connected client.
//   npx tsx scripts/sync-gsc.ts
//
// Useful for backfilling or running outside Vercel cron.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { syncGscForClient } from '../src/lib/gsc';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await supabase
    .from('integrations')
    .select('client_id, config')
    .eq('kind', 'gsc')
    .eq('status', 'connected');

  for (const i of data ?? []) {
    const siteUrl = (i.config as any)?.site_url;
    if (!siteUrl) continue;
    try {
      const r = await syncGscForClient(i.client_id, siteUrl, 14);
      console.log(`✓ ${i.client_id}`, r);
    } catch (err) {
      console.error(`✗ ${i.client_id}`, err);
    }
  }
}
main();
