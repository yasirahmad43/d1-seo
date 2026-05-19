import { fmtInt, fmtPosition } from '@/lib/utils';

type Row = {
  page_url: string;
  impressions: number;
  clicks: number;
  avg_position: number;
};

export default function PagePerfTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No page data yet.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Page</th>
            <th className="text-right">Impressions</th>
            <th className="text-right">Clicks</th>
            <th className="text-right">Position</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.page_url}>
              <td className="truncate max-w-md"><code className="text-xs">{r.page_url}</code></td>
              <td className="text-right">{fmtInt(r.impressions)}</td>
              <td className="text-right">{fmtInt(r.clicks)}</td>
              <td className="text-right">{fmtPosition(r.avg_position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
