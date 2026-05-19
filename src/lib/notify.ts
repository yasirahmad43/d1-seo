// Notification helper — call from anywhere on the server to fan out an event.
// Mirrors d1app's pattern: server-side body builder + audience splitter.
//
// Usage from another server module:
//   import { notify } from '@/lib/notify';
//   await notify({
//     event_type: 'new_lead',
//     client_id,
//     actor_id: null,                       // system events have no actor
//     title: 'New SEO lead from Toledo',
//     body: 'Jared M. · organic · /movers/ohio/toledo/',
//     admin_body: '...',                    // optional split for admins
//     link: `/dashboard/leads`
//   });
//
// The /api/notify route delegates to this so external callers (Claude
// sessions, n8n workflows) can use the same plumbing.

import { createSupabaseAdminClient } from './supabase/server';

export type NotifyInput = {
  event_type: 'new_lead' | 'rank_gain' | 'rank_drop' | 'milestone' | 'watcher_error' | 'weekly_digest' | 'monthly_digest';
  client_id?: string | null;
  actor_id?: string | null;
  title: string;
  body?: string;
  admin_body?: string;
  link?: string;
  include_admins?: boolean;
};

export async function notify(input: NotifyInput) {
  const supabase = createSupabaseAdminClient();
  const include_admins = input.include_admins !== false;

  // Recipient set: everyone with access to this client + (optionally) all agency admins.
  const recipients = new Set<string>();
  if (input.client_id) {
    const { data: viewers } = await supabase
      .from('memberships').select('user_id')
      .eq('client_id', input.client_id);
    for (const v of viewers ?? []) recipients.add(v.user_id);
  }
  if (include_admins) {
    const { data: admins } = await supabase
      .from('users').select('id').in('role', ['admin','staff']);
    for (const a of admins ?? []) recipients.add(a.id);
  }
  // Drop the actor — they did it, they don't need a ping.
  if (input.actor_id) recipients.delete(input.actor_id);

  if (recipients.size === 0) return { delivered: 0 };

  // Filter by per-user preference for this event type.
  const ids = Array.from(recipients);
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select(`user_id, email_enabled, ${input.event_type}`)
    .in('user_id', ids);
  const prefByUser: Record<string, any> = {};
  for (const p of prefs ?? []) prefByUser[p.user_id] = p;

  const finalRecipients = ids.filter(uid => {
    const p = prefByUser[uid];
    if (!p) return true;                       // default true if no row
    return (p as any)[input.event_type] !== false;
  });
  if (!finalRecipients.length) return { delivered: 0 };

  // Build the rows — admin_body for admins, body for everyone else.
  const adminIds = new Set<string>();
  const { data: admins2 } = await supabase
    .from('users').select('id').in('role', ['admin','staff'])
    .in('id', finalRecipients);
  for (const a of admins2 ?? []) adminIds.add(a.id);

  const rows = finalRecipients.map(uid => ({
    user_id: uid,
    client_id: input.client_id ?? null,
    event_type: input.event_type,
    title: input.title,
    body: (input.admin_body && adminIds.has(uid)) ? input.admin_body : (input.body ?? null),
    link: input.link ?? null
  }));
  await supabase.from('notifications').insert(rows);

  // Email fanout via Resend (optional — only if RESEND_API_KEY set).
  if (process.env.RESEND_API_KEY) {
    const emailRecipients = finalRecipients.filter(uid => prefByUser[uid]?.email_enabled !== false);
    if (emailRecipients.length) {
      const { data: usersData } = await supabase
        .from('users').select('id, email, full_name')
        .in('id', emailRecipients);
      await Promise.all((usersData ?? []).map(u => sendEmail({
        to: u.email!,
        subject: input.title,
        text: (adminIds.has(u.id) && input.admin_body) ? input.admin_body : (input.body ?? input.title)
      })));
    }
  }

  return { delivered: finalRecipients.length };
}

async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM ?? 'D1TechCreative <noreply@d1techcreative.com>',
        to, subject, text
      })
    });
  } catch (err) {
    console.error('resend send failed:', err);
  }
}
