// Programmatic changelog ingestion — Claude sessions or n8n flows can POST work as it ships.
// Auth: header `x-api-token` must equal env CRON_SECRET.
//
// Payload:
// {
//   "client_slug": "a-plus-moving",  // or "client_id"
//   "kind": "page_published",
//   "title": "Published 6 resource guide pages",
//   "description": "...",
//   "related_url": "...",
//   "occurred_at": "2026-04-08T10:00:00Z",  // optional
//   "client_visible": true
// }

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const ALLOWED_KINDS = new Set([
  'audit','page_published','page_updated','redirect_added','schema_deployed',
  'snippet_added','meta_updated','image_optimized','indexing_request',
  'citation_submitted','review_collected','milestone','other'
]);

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-api-token');
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  let clientId: string | null = body.client_id ?? null;
  if (!clientId && body.client_slug) {
    const { data } = await supabase.from('clients').select('id').eq('slug', body.client_slug).maybeSingle();
    clientId = data?.id ?? null;
  }
  if (!clientId) return NextResponse.json({ error: 'unknown client' }, { status: 400 });

  const kind = ALLOWED_KINDS.has(body.kind) ? body.kind : 'other';
  const { data, error } = await supabase.from('changelog').insert({
    client_id: clientId,
    kind,
    title: body.title,
    description: body.description ?? null,
    related_url: body.related_url ?? null,
    occurred_at: body.occurred_at ?? new Date().toISOString(),
    client_visible: body.client_visible ?? true,
    metadata: body.metadata ?? {}
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
