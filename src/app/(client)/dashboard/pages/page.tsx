import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveClientId } from '@/lib/active-client';
import PagePerfTable from '@/components/PagePerfTable';

export default async function PagesPage({ searchParams }: { searchParams: { client?: string } }) {
  const clientId = await resolveActiveClientId(searchParams);
  if (!clientId) return null;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('gsc_page_daily')
    .select('page_url, impressions, clicks, avg_position')
    .eq('client_id', clientId)
    .order('impressions', { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Top performing pages</h1>
      <PagePerfTable rows={(data ?? []) as any} />
    </div>
  );
}
