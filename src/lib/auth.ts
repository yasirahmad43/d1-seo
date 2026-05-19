import { createSupabaseServerClient } from './supabase/server';
import { redirect } from 'next/navigation';

export type SessionUser = {
  id: string;
  email: string;
  role: 'admin' | 'staff' | 'client_viewer';
  org_id: string | null;
  client_id: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from('memberships')
    .select('role, org_id, client_id')
    .eq('user_id', user.id);

  if (!memberships?.length) return null;

  // prefer admin/staff role if present, else client_viewer
  const m = memberships.find((x: any) => x.role === 'admin' || x.role === 'staff') ?? memberships[0];
  return {
    id: user.id,
    email: user.email ?? '',
    role: m.role as any,
    org_id: m.org_id,
    client_id: m.client_id
  };
}

export async function requireAgency() {
  const u = await getSessionUser();
  if (!u) redirect('/login');
  if (u.role !== 'admin' && u.role !== 'staff') redirect('/dashboard');
  return u;
}

export async function requireClientViewer() {
  const u = await getSessionUser();
  if (!u) redirect('/login');
  return u;
}
