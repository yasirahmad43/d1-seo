import { createSupabaseServerClient } from '@/lib/supabase/server';
import { relativeDate } from '@/lib/utils';

export default async function AutomationPage() {
  const supabase = createSupabaseServerClient();
  const [{ data: clients }, { data: runs }, { data: autoCount }] = await Promise.all([
    supabase.from('clients').select('id, name'),
    supabase.from('watcher_run').select('client_id, watcher, last_run_at, last_status, last_detail'),
    supabase.from('changelog').select('client_id, metadata').filter('metadata->>auto', 'eq', 'true').gte('occurred_at', new Date(Date.now() - 7*86400000).toISOString())
  ]);

  const runsByClient: Record<string, any[]> = {};
  for (const r of runs ?? []) (runsByClient[r.client_id] ??= []).push(r);

  const autoByClient: Record<string, number> = {};
  for (const c of autoCount ?? []) autoByClient[c.client_id] = (autoByClient[c.client_id] ?? 0) + 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Automation status</h1>
      <p className="text-sm text-slate-500 mb-4">Watchers feed the changelog. Healthy = auto-entries land daily without you doing anything.</p>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>WP watcher</th>
              <th>GSC delta</th>
              <th className="text-right">Auto entries (7d)</th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map(c => {
              const wp  = runsByClient[c.id]?.find(r => r.watcher === 'wp');
              const gsc = runsByClient[c.id]?.find(r => r.watcher === 'gsc_delta');
              return (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>
                    {wp ? (
                      <>
                        <span className={`pill ${wp.last_status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{wp.last_status}</span>
                        <span className="text-xs text-slate-500 ml-2">ran {relativeDate(wp.last_run_at)}</span>
                      </>
                    ) : <span className="text-xs text-slate-400">not configured</span>}
                  </td>
                  <td>
                    {gsc ? (
                      <>
                        <span className={`pill ${gsc.last_status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{gsc.last_status}</span>
                        <span className="text-xs text-slate-500 ml-2">ran {relativeDate(gsc.last_run_at)}</span>
                      </>
                    ) : <span className="text-xs text-slate-400">awaiting first run</span>}
                  </td>
                  <td className="text-right font-semibold">{autoByClient[c.id] ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card mt-4 text-sm space-y-2">
        <h2 className="font-semibold">How to enable WP auto-watching for a client</h2>
        <ol className="list-decimal pl-5 space-y-1 text-slate-700">
          <li>In WP admin: Users → Profile → Application Passwords. Generate one named "D1 Dashboard".</li>
          <li>In Supabase SQL editor, update the integration row:
            <pre className="bg-slate-50 rounded p-2 text-xs mt-1 overflow-x-auto">{`update integrations set
  config      = config      || jsonb_build_object('wp_base_url','https://example.com'),
  credentials = credentials || jsonb_build_object('app_user','daniel','app_pass','xxxx xxxx xxxx xxxx')
where client_id = '<id>' and kind = 'elementor';`}</pre>
          </li>
          <li>The 30-minute cron picks it up next run. First run snapshots state and only logs net-new changes from then on.</li>
        </ol>
      </div>
    </div>
  );
}
