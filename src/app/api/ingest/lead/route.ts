// Webhook receiver for Elementor / Zapier lead submissions.
// Configure Elementor's "Webhook" action to POST here.
// Expected payload (loose — we accept whatever Elementor sends):
//
// {
//   "client_slug": "a-plus-moving",                // OR pass client_id
//   "submission_id": "elementor-xxx",
//   "form_data": {
//     "utm_source": "google", "utm_medium":"organic", ...
//     "fbclid":"...", "gclid":"...", "msclkid":"...",
//     "landing_page":"/movers/ohio/toledo/",
//     "referrer":"https://www.google.com/",
//     "Full Name":"Jane Doe", "Phone":"...", "Email":"...",
//     ...everything else captured by the form
//   }
// }
//
// Auth: header `x-webhook-secret` must equal env LEAD_WEBHOOK_SECRET.

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { deriveSourceBucket } from '@/lib/attribution';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.LEAD_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  const supabase = createSupabaseAdminClient();

  // resolve client
  let clientId: string | null = body.client_id ?? null;
  if (!clientId && body.client_slug) {
    const { data } = await supabase.from('clients').select('id').eq('slug', body.client_slug).maybeSingle();
    clientId = data?.id ?? null;
  }
  if (!clientId) return NextResponse.json({ error: 'unknown client' }, { status: 400 });

  // normalize field names — Elementor sometimes Title Cases them
  const f = body.form_data ?? body;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (f[k] != null && f[k] !== '') return f[k];
      const lower = k.toLowerCase();
      for (const key of Object.keys(f)) if (key.toLowerCase() === lower && f[key] !== '') return f[key];
    }
    return null;
  };

  const attribution = {
    utm_source:   pick('utm_source'),
    utm_medium:   pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_term:     pick('utm_term'),
    utm_content:  pick('utm_content'),
    fbclid:       pick('fbclid'),
    gclid:        pick('gclid'),
    msclkid:      pick('msclkid'),
    landing_page: pick('landing_page'),
    referrer:     pick('referrer','Referrer')
  };
  const source_bucket = deriveSourceBucket(attribution);

  const contact = {
    name:  pick('Full Name','full_name','name'),
    phone: pick('Phone','phone'),
    email: pick('Email','email')
  };
  // anything else: keep as opaque payload
  const known = new Set([
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
    'fbclid','gclid','msclkid','landing_page','referrer','Referrer',
    'Full Name','full_name','name','Phone','phone','Email','email'
  ]);
  const payload: Record<string, any> = {};
  for (const k of Object.keys(f)) if (!known.has(k)) payload[k] = f[k];

  const insert = {
    client_id: clientId,
    external_id: body.submission_id ?? null,
    submitted_at: body.submitted_at ?? new Date().toISOString(),
    ...attribution,
    source_bucket,
    contact,
    payload
  };
  const { data, error } = await supabase.from('leads').insert(insert).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id, source_bucket });
}
