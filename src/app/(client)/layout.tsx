import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireClientViewer } from '@/lib/auth';
import { getClientFreshness } from '@/lib/freshness';
import SignOutButton from '@/components/SignOutButton';

function fmtRel(iso: string | null): string {
  if (!iso) return 'never';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClientViewer();
  const supabase = createSupabaseServerClient();

  let activeClient: any = null;
  if (user.role === 'admin' || user.role === 'staff') {
    const { data } = await supabase.from('clients').select('*').limit(1).maybeSingle();
    activeClient = data;
  } else if (user.client_id) {
    const { data } = await supabase.from('clients').select('*').eq('id', user.client_id).maybeSingle();
    activeClient = data;
  }

  const freshness = activeClient ? await getClientFreshness(activeClient.id) : null;

  return (
    <div className="min-h-screen">
      <header style={{ background: activeClient?.brand_dark ?? '#0A2540' }} className="text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-bold">{activeClient?.name ?? 'Your dashboard'}</div>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard">Overview</Link>
              <Link href="/dashboard/keywords">Keywords</Link>
              <Link href="/dashboard/pages">Pages</Link>
              <Link href="/dashboard/leads">Leads</Link>
              <Link href="/dashboa