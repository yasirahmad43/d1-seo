// GSC delta watcher.
//
// Runs *after* the nightly GSC sync. Compares yesterday's data to today's:
//   - newly indexed pages          → page_published (auto)
//   - keyword rank gains > 5 pos   → milestone changelog + alert
//   - keyword rank drops > 5 pos   → alert (not changelog — clients don't need to see the dips)
//   - impression spikes > 50%      → milestone changelog (notable, client-visible)
//   - indexed-count milestones     → milestone changelog at +10/+25/+50/+100

import { createSupabaseAdminClient } from './supabase/server';
import { notify } from './notify';

export async function watchGsc(clientId: string): Promise<{ entries: number; detail: any }> {
  const supabase = createSupabaseAdminClient();
  let entries = 0;
  const detail: any = {};

  // ---- 1. Newly indexed pages
  const { data: todayPages } = await supabase
    .from('gsc_page_daily')
    .select('page_url')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(2000);

  const seen = new Set((todayPages ?? []).map(r => r.page_url));
  const { data: known } = await supabase
    .from('indexed_page_state')
    .select('page_url')
    .eq('client_id', clientId);
  const knownSet = new Set((known ?? []).map(k => k.page_url));

  const newlyIndexed = Array.from(seen).filter(u => !knownSet.has(u));
  if (newlyIndexed.length) {
    await supabase.from('indexed_page_state').upsert(
      newlyIndexed.map(u => ({ client_id: clientId, page_url: u, first_indexed_at: new Date().toISOString().slice(0,10), last_seen_at: new Date().toISOString().slice(0,10) })),
      { onConflict: 'client_id,page_url' }
    );
    const sample = newlyIndexed.slice(0, 5).join(', ') + (newlyIndexed.length > 5 ? '…' : '');
    await supabase.from('changelog').insert({
      client_id: clientId,
      kind: 'indexing_request',
      title: `${newlyIndexed.length} new page${newlyIndexed.length === 1 ? '' : 's'} appeared in Google's index`,
      description: sample,
      metadata: { auto: true, source: 'gsc_watcher', count: newlyIndexed.length }
    });
    entries++;
  }
  detail.newly_indexed = newlyIndexed.length;

  // ---- 2. Indexed-page count milestones
  const totalIndexed = knownSet.size + newlyIndexed.length;
  const { data: baselineRow } = await supabase
    .from('baseline_snapshot').select('metrics').eq('client_id', clientId).maybeSingle();
  const baselineCount = Number(
    (baselineRow?.metrics as any)?.pages_indexed_n ??
    parseInt(String((baselineRow?.metrics as any)?.pages_indexed ?? '0').match(/\d+/)?.[0] ?? '0')
  );
  const delta = totalIndexed - baselineCount;
  const milestones = [10, 25, 50, 100, 200, 500];
  for (const m of milestones) {
    if (delta >= m) {
      // emit at most once by checking if we already have a milestone changelog entry for this threshold
      const { count } = await supabase
        .from('changelog')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('kind', 'milestone')
        .filter('metadata->>milestone_threshold', 'eq', String(m));
      if (!count) {
        await supabase.from('changelog').insert({
          client_id: clientId,
          kind: 'milestone',
          title: `+${m} pages indexed since baseline (now ${totalIndexed})`,
          description: `Started at ${baselineCount}, now at ${totalIndexed}.`,
          metadata: { auto: true, source: 'gsc_watcher', milestone_threshold: String(m), total_indexed: totalIndexed, baseline: baselineCount }
        });
        entries++;
      }
    }
  }
  detail.total_indexed = totalIndexed;
  detail.indexed_delta_vs_baseline = delta;

  // ---- 3. Keyword rank deltas (tracked keywords only)
  const { data: tracked } = await supabase
    .from('tracked_keywords')
    .select('query')
    .eq('client_id', clientId)
    .eq('active', true);

  const { data: rankNow } = await supabase
    .from('gsc_query_daily')
    .select('query, avg_position, impressions, clicks, date')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(2000);

  const latestByQuery: Record<string, any> = {};
  for (const r of rankNow ?? []) if (!latestByQuery[r.query]) latestByQuery[r.query] = r;

  const { data: prevState } = await supabase
    .from('keyword_rank_state')
    .select('query, last_position, last_impressions')
    .eq('client_id', clientId);
  const prevByQuery: Record<string, any> = {};
  for (const r of prevState ?? []) prevByQuery[r.query] = r;

  let bigGains = 0, bigDrops = 0;
  const gainsToLog: { query: string; from: number; to: number }[] = [];
  for (const t of tracked ?? []) {
    const now = latestByQuery[t.query];
    if (!now) continue;
    const prev = prevByQuery[t.query];
    if (prev?.last_position != null) {
      const from = Number(prev.last_position);
      const to   = Number(now.avg_position);
      const moved = from - to;     // positive = improved (closer to #1)
      if (moved >= 5) { bigGains++; gainsToLog.push({ query: t.query, from, to }); }
      if (moved <= -5) {
        bigDrops++;
        await supabase.from('alerts').insert({
          client_id: clientId, kind: 'rank_drop', severity: 'warn',
          title: `Rank drop: "${t.query}" went from ${from.toFixed(1)} → ${to.toFixed(1)}`,
          detail: { query: t.query, from, to }
        });
      }
    }
    await supabase.from('keyword_rank_state').upsert({
      client_id: clientId, query: t.query,
      last_position: now.avg_position,
      last_impressions: now.impressions,
      last_clicks: now.clicks,
      last_seen_date: now.date
    }, { onConflict: 'client_id,query' });
  }

  if (bigGains > 0) {
    const top = gainsToLog.slice(0, 3).map(g => `"${g.query}" ${g.from.toFixed(0)}→${g.to.toFixed(0)}`).join(', ');
    await supabase.from('changelog').insert({
      client_id: clientId,
      kind: 'milestone',
      title: `${bigGains} tracked keyword${bigGains === 1 ? '' : 's'} jumped 5+ positions`,
      description: top + (gainsToLog.length > 3 ? '…' : ''),
      metadata: { auto: true, source: 'gsc_watcher', gains: gainsToLog }
    });
    await notify({
      event_type: 'rank_gain', client_id: clientId,
      title: `Rank gain: ${bigGains} keyword${bigGains === 1 ? '' : 's'} jumped 5+ positions`,
      body: top,
      link: '/dashboard/keywords'
    });
    entries++;
  }
  if (bigDrops > 0) {
    await notify({
      event_type: 'rank_drop', client_id: clientId,
      title: `Heads up: ${bigDrops} keyword${bigDrops === 1 ? '' : 's'} dropped 5+ positions`,
      body: 'Check the Keywords tab for details.',
      link: '/dashboard/keywords',
      include_admins: true
    });
  }
  detail.rank_gains_over_5 = bigGains;
  detail.rank_drops_over_5 = bigDrops;

  // ---- 4. 7-day impression spike
  const { data: kpi } = await supabase
    .from('v_kpi_periods')
    .select('impressions_7d, impressions_28d').eq('client_id', clientId).maybeSingle();
  if (kpi?.impressions_7d && kpi?.impressions_28d) {
    const avg7  = Number(kpi.impressions_7d) / 7;
    const avg28 = Number(kpi.impressions_28d) / 28;
    if (avg28 > 0 && avg7 / avg28 >= 1.5) {
      // dedupe: only emit if not already logged today
      const { count } = await supabase
        .from('changelog')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('kind', 'milestone')
        .gte('occurred_at', new Date(Date.now() - 86400000).toISOString())
        .filter('metadata->>spike', 'eq', 'true');
      if (!count) {
        const ratio = (avg7 / avg28).toFixed(1);
        await supabase.from('changelog').insert({
  