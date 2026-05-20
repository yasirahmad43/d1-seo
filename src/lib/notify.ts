// Notification fanout — stubbed for v1. Re-add when SMTP configured.
export type NotifyInput = {
  event_type: string;
  client_id?: string | null;
  actor_id?: string | null;
  title: string;
  body?: string;
  admin_body?: string;
  link?: string;
  include_admins?: boolean;
};
export async function notify(_input: NotifyInput) {
  return { delivered: 0 };
}
