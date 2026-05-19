import Link from 'next/link';
import { requireAgency } from '@/lib/auth';
import SignOutButton from '@/components/SignOutButton';

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAgency();
  return (
    <div className="min-h-screen">
      <header className="bg-brand-dark text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold">D1 SEO · Agency</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin" className="hover:underline">Clients</Link>
              <Link href="/admin/changelog" className="hover:underline">Post update</Link>
              <Link href="/admin/invites" className="hover:underline">Invites</Link>
              <Link href="/admin/automation" className="hover:underline">Automation</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-80">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </heade