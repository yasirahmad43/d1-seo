import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveActiveClientId } from '@/lib/active-client';
import LeadTable from '@/components/LeadTable';

export default async function LeadsPage({ searchParams }: { searchParams: { client?: string } }) {
  const clientId = await resolveActiveClientId(searchParams);
  if (!clientId) return null;
  const supabase = createSupabaseServerClient();
  const [{ data: leads }, { data: mix }] = await Promise.all([
    supabase.from('leads').select('*').eq('client_id', clientId).order('submitted_at', { ascending: false }).limit(100),
    supabase.from('v_lead_source_breakdown_28d').select('*').eq('client_id', clientId)
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leads</h1>
      {mix && mix.length > 0 && (
        <div className="card">
          <div className="kpi-label mb-2">Source mix · last 28 days</div>
          <ul className="text-sm flex flex-wrap gap-4">
            {mix.map((s: any) => (
              <li key={s.source_bucket} className="flex items-center gap-2">
                <span className="capitalize">{s.source_bucket}</span>
                <span className="pill bg-slate-100 text-slate-700">{s.leads}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <LeadTable leads={(leads ?? []) as any} />
      <p className="text-xs text-slate-500">
        Attribution captured at form-submit time (WPCode snippet 5820 or equivalent). Pre-tracking submissions show as <code>direct</code>.
      </p>
    </div>
  );
}
