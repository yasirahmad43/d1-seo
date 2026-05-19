import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAgency } from '@/lib/auth';
import crypto from 'crypto';

async function createInvite(formData: FormData) {
  'use server';
  const user = await requireAgency();
  const supabase = createSupabaseServerClient();
  const token = crypto.randomBytes(24).toString('hex');
  await supabase.from('invitations').insert({
    org_id: user.org_id,
    client_id: formData.get('client_id') as string,
    email: (formData.get('email') as string).toLowerCase().trim(),
    role: 'client_viewer',
    token,
    created_by: user.id
  });
  revalidatePath('/admin/invites');
  redirect('/admin/invites');
}

export default async function InvitesPage() {
  const supabase = createSupabaseServerClient();
  const { data: clients } = await supabase.from('clients').select('id, name').order('name');
  const { data: invites } = await supabase
    .from('invitations')
    .select('id, email, client_id, role, accepted_at, expires_at, token')
    .order('created_at', { ascending: false });

  const clientName: Record<string, string> = {};
  for (const c of clients ?? []) clientName[c.id] = c.name;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Invite a client viewer</h1>
      <form action={createInvite} className="card space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <select name="client_id" required className="w-full px-3 py-2 border border-slate-300 rounded-md">
            {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Their email</label>
          <input name="email" type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-md" />
        </div>
        <button type="submit" className="btn-primary">Create invite</button>
        <p className="text-xs text-slate-500">
          For MVP, share the magic-link sign-in URL with the invitee. After they sign in, attach their <code>auth.users.id</code> to a <code>memberships</code> row with <code>role = 'client_viewer'</code> for the chosen client. Future: wire SMTP + automatic provisioning.
        </p>
      </form>

      <div>
        <h2 className="font-semibold mb-2">Open invites</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Email</th><th>Client</th><th>Status</th><th>Expires</th></tr>
            </thead>
            <tbody>
              {(invites ?? []).map(i => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{clientName[i.client_id] ?? '—'}</td>
                  <td>
                    <span className={`pill ${i.accepted_at ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {i.accepted_at ? 'accepted' : 'pending'}
                    </span>
                  </td>
                  <td className="text-xs">{i.expires_at?.slice(0,10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
