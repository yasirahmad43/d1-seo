import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveClientId } from '@/lib/active-client';
import ChangelogFeed from '@/components/ChangelogFeed';

export default async function ChangelogPage({ searchParams }: { searchParams: { client?: string } }) {
  const clientId = await resolveActiveClientId(searchParams);
  if (!clientId) return null;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('changelog')
    .select('id, occurred_at, kind, title, description, related_url')
    .eq('client_id', clientId)
    .eq('client_visible', true)
    .order('occurred_at', { ascending: false })
    .limit(200);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Full work log</h1>
      <ChangelogFeed entries={(data ?? []) as any} />
    </div>
  );
}
