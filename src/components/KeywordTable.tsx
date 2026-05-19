import { fmtInt, fmtPosition } from '@/lib/utils';

type Row = {
  query: string;
  intent: string;
  impressions: number | null;
  clicks: number | null;
  avg_position: number | null;
};

export default function KeywordTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No keyword data yet.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Query</th>
            <th>Intent</th>
            <th className="text-right">Position</th>
            <th className="text-right">Impressions</th>
            <th className="text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.query}>
              <td className="font-medium">{r.query}</td>
              <td><span className="pill bg-slate-100 text-slate-600">{r.intent}</span></td>
              <td className="text-right">{fmtPosition(r.avg_position)}</td>
              <td className="text-right">{fmtInt(r.impressions)}</td>
              <td className="text-right">{fmtInt(r.clicks)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
