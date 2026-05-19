'use client';
import { useRouter, useSearchParams } from 'next/navigation';

type Client = { id: string; name: string };

export default function ClientSwitcher({ clients, activeId }: { clients: Client[]; activeId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(search?.toString());
    params.set('client', e.target.value);
    router.push(`?${params.toString()}`);
  }
  return (
    <select
      value={activeId}
      onChange={onChange}
      className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
    >
      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}
