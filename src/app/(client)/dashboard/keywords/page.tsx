import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveClientId } from '@/lib/active-client';
import KeywordTable from '@/components/KeywordTable';

export default async function KeywordsPage({ searchParams }: { searchParams: { client?: string } }) {
  const clientId = await resolveActiveClientId(searchParams);
  if (!clientId) return null;
  const supabase = createSupabaseServerClient();

  const { data: tracked } = await supabase
    .from('tracked_keywords')
    .select('query, intent')
    .eq('client_id', clientId)
    .eq('active', true);

  const { data: gscRows } = await supabase
    .from('gsc_query_daily')
    .select('query, impressions, clicks, avg_position')
    .eq('client_id', clientId)
    .order('impressions', { ascending: false })
    .limit(500);

  // join: show tracked keyword's latest GSC row when present
  const byQuery: Record<string, any> = {};
  for (const r of gscRows ?? []) byQuery[r.query] = r;
  const rows = (tracked ?? []).map(t => ({
    query: t.query,
    intent: t.intent,
    impressions: byQuery[t.query]?.impressions ?? null,
    clicks: byQuery[t.query]?.clicks ?? null,
    avg_position: byQuery[t.query]?.avg_position ?? null
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tracked keywords</h1>
      <KeywordTable rows={rows} />
      <p className="text-xs text-slate-500 mt-3">
        Tracked keywords are updated nightly from Google Search Console. Position is averaged across the last day's GSC sample.
      </p>
    </div>
  );
}
