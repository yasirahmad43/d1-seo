import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAgency } from '@/lib/auth';

async function postEntry(formData: FormData) {
  'use server';
  const user = await requireAgency();
  const supabase = createSupabaseServerClient();
  const payload = {
    client_id: formData.get('client_id') as string,
    kind: (formData.get('kind') as string) || 'other',
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    related_url: (formData.get('related_url') as string) || null,
    performed_by: user.id,
    client_visible: formData.get('client_visible') === 'on'
  };
  await supabase.from('changelog').insert(payload);
  revalidatePath('/admin');
  redirect('/admin/changelog?ok=1');
}

export default async function PostChangelogPage({ searchParams }: { searchParams: { ok?: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: clients } = await supabase.from('clients').select('id, name').order('name');
  const kinds = [
    'audit','page_published','page_updated','redirect_added','schema_deployed',
    'snippet_added','meta_updated','image_optimized','indexing_request',
    'citation_submitted','review_collected','milestone','other'
  ];
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Post a changelog entry</h1>
      {searchParams.ok && <p className="text-sm text-green-700 mb-3">Posted!</p>}
      <form action={postEntry} className="card space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <select name="client_id" required className="w-full px-3 py-2 border border-slate-300 rounded-md">
            {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Kind</label>
          <select name="kind" className="w-full px-3 py-2 border border-slate-300 rounded-md">
            {kinds.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input name="title" required className="w-full px-3 py-2 border border-slate-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea name="description" rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Related URL</label>
          <input name="related_url" className="w-full px-3 py-2 border border-slate-300 rounded-md" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="client_visible" defaultChecked /> Visible to client
        </label>
        <button type="submit" className="btn-primary">Post entry</button>
      </form>

      <div className="mt-4 text-xs text-slate-500 card">
        <p className="font-medium text-slate-700 mb-1">Programmatic ingestion</p>
        <p>You can also POST to <code>/api/ingest/changelog</code> with header <code>x-api-token</code> set to <code>CRON_SECRET</code>. Useful for Claude sessions auto-posting work as it ships.</p>
      </div>
    </div>
  );
}
