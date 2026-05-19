// Resolves the client id the current request should display.
// - client_viewer: their assigned client
// - admin/staff: ?client= override, else first client

import { createSupabaseServerClient } from './supabase/server';
import { getSessionUser } from './auth';

export async function resolveActiveClientId(searchParams?: { client?: string }): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === 'client_viewer') return user.client_id;
  // agency: allow override
  if (searchParams?.client) return searchParams.client;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from('clients').select('id').order('name').limit(1).maybeSingle();
  return data?.id ?? null;
}
