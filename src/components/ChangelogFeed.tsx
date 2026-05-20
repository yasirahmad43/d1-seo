import { relativeDate } from '@/lib/utils';

type Entry = {
  id: string;
  occurred_at: string;
  kind: string;
  title: string;
  description: string | null;
  related_url?: string | null;
};

const kindLabel: Record<string, { label: string; cls: string }> = {
  audit:             { label: 'Audit',           cls: 'bg-zinc-800 text-zinc-200' },
  page_published:    { label: 'Page Published',  cls: 'bg-emerald-900/40 text-emerald-300' },
  page_updated:      { label: 'Page Updated',    cls: 'bg-sky-900/40 text-sky-300' },
  redirect_added:    { label: 'Redirect',        cls: 'bg-amber-900/40 text-amber-300' },
  schema_deployed:   { label: 'Schema',          cls: 'bg-blue-900/40 text-blue-300' },
  snippet_added:     { label: 'Snippet',         cls: 'bg-sky-900/40 text-sky-300' },
  meta_updated:      { label: 'Metadata',        cls: 'bg-blue-900/40 text-blue-300' },
  image_optimized:   { label: 'Images',          cls: 'bg-teal-900/40 text-teal-300' },
  indexing_request:  { label: 'Indexing',        cls: 'bg-amber-900/40 text-amber-300' },
  citation_submitted:{ label: 'Citation',        cls: 'bg-pink-900/40 text-pink-300' },
  review_collected:  { label: 'Review',          cls: 'bg-amber-900/40 text-amber-300' },
  milestone:         { label: 'Milestone',       cls: 'bg-emerald-900/40 text-emerald-300' },
  other:             { label: 'Update',          cls: 'bg-zinc-800 text-zinc-200' }
};

export default function ChangelogFeed({ entries }: { entries: Entry[] }) {
  if (!entries.length) return <p className="text-sm text-slate-400">No changelog entries yet.</p>;
  return (
    <ol className="space-y-3">
      {entries.map(e => {
        const k = kindLabel[e.kind] ?? kindLabel.other;
        return (
          <li key={e.id} className="card">
            <div className="flex items-center gap-2 mb-1">
              <span className={`pill ${k.cls}`}>{k.label}</span>
              <span className="text-xs text-slate-400">{relativeDate(e.occurred_at)}</span>
            </div>
            <div className="font-medium">{e.title}</div>
            {e.description && <p className="text-sm text-slate-300 mt-1">{e.description}</p>}
            {e.related_url && (
              <a href={e.related_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline mt-1 inline-block">View ↗</a>
            )}
          </li>
        );
      })}
    </ol>
  );
}
