import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireClientViewer } from '@/lib/auth';
import SignOutButton from '@/components/SignOutButton';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClientViewer();
  const supabase = createSupabaseServerClient();
  let activeClient: any = null;
  if (user.client_id) {
    const { data } = await supabase.from('clients').select('*').eq('id', user.client_id).maybeSingle();
    activeClient = data;
  } else {
    const { data } = await supabase.from('clients').select('*').limit(1).maybeSingle();
    activeClient = data;
  }
  return (
    <div className="min-h-screen">
      <header className="text-white" style={{ background: activeClient?.brand_dark ?? '#0A2540' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-bold">{activeClient?.name ?? 'Your dashboard'}</div>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard">Overview</Link>
              <Link href="/dashboard/keywords">Keywords</Link>
              <Link href="/dashboard/pages">Pages</Link>
              <Link href="/dashboard/leads">Leads</Link>
              <Link href="/dashboard/changelog">Changelog</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-80">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
