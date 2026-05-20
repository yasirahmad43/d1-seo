import { relativeDate } from '@/lib/utils';

type Lead = {
  id: string;
  submitted_at: string;
  source_bucket: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  contact: Record<string, any>;
  status: string;
};

const bucketStyle: Record<string, string> = {
  organic:  'bg-emerald-900/40 text-emerald-300',
  paid:     'bg-amber-900/40 text-amber-300',
  social:   'bg-pink-900/40 text-pink-300',
  direct:   'bg-zinc-800 text-zinc-300',
  ai:       'bg-sky-900/40 text-sky-300',
  email:    'bg-blue-900/40 text-blue-300',
  referral: 'bg-blue-900/40 text-blue-300'
};

export default function LeadTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) return <p className="text-sm text-slate-500">No leads yet.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Source</th>
            <th>Campaign / Page</th>
            <th>Contact</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(l => {
            const isSeo = l.source_bucket === 'organic' || l.source_bucket === 'ai';
            return (
              <tr key={l.id} className={isSeo ? 'bg-emerald-900/10' : undefined}>
                <td className="whitespace-nowrap">
                  {isSeo && <span title="SEO-attributed" className="text-emerald-400 mr-1">●</span>}
                  {relativeDate(l.submitted_at)}
                </td>
                <td>
                  <span className={`pill ${bucketStyle[l.source_bucket ?? 'direct'] ?? bucketStyle.direct}`}>
                    {l.source_bucket ?? 'direct'}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {l.utm_source ?? '-'}/{l.utm_medium ?? '-'}
                  </span>
                </td>
                <td>
                  <div className="text-sm">{l.utm_campaign ?? <span className="text-slate-500">no campaign</span>}</div>
                  <div className="text-xs text-slate-400">{l.landing_page ?? ''}</div>
                </td>
                <td>
                  <div className="text-sm">{l.contact?.name ?? 'Anonymous'}</div>
                  <div className="text-xs text-slate-400">{l.contact?.phone ?? l.contact?.email ?? ''}</div>
                </td>
                <td><span className="pill bg-slate-800 text-slate-200">{l.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
