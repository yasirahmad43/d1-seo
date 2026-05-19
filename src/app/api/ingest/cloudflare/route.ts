// Cloudflare cache-purge webhook receiver.
// In Cloudflare → Notifications → Workers/Cache Purge, set a Webhook
// destination pointing here. Each purge = a "site refresh" event.
//
// Auth: x-webhook-secret must match LEAD_WEBHOOK_SECRET (same one we use
// for the lead webhook — it's the agency-controlled shared secret).

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-webhook-secret') !== process.env.LEAD_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad json' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  let clientId: string | null = body.client_id ?? null;
  if (!clientId && body.zone_name) {
    const { data } = await supabase
      .from('clients').select('id, website')
      .filter('website', 'ilike', `%${body.zone_name}%`).maybeSingle();
    clientId = data?.id ?? null;
  }
  if (!clientId) return NextResponse.json({ error: 'unknown client' }, { status: 400 });

  await supabase.from('changelog').insert({
    client_id: clientId,
    kind: 'other',
    title: 'Site cache refreshed',
    description: `Cloudflare purge${body.zone_name ? ` on ${body.zone_name}` : ''}.`,
    metadata: { auto: true, source: 'cloudflare', raw: body }
  });
  return NextResponse.json({ ok: true });
}
