// Google Search Console wrapper.
//
// The dashboard supports two auth modes per client:
//   1. Service account (recommended). The client adds the SA email as a GSC
//      user with "Restricted" access. We use the keyfile for all clients.
//   2. OAuth (per-client). The agency or client connects their Google account
//      via OAuth. We store refresh tokens encrypted in integrations.credentials.
//
// For MVP we ship the service-account path. OAuth path is stubbed.

import { google } from 'googleapis';
import { createSupabaseAdminClient } from './supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

function getSearchConsoleClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });
  return google.searchconsole({ version: 'v1', auth });
}

export type GscDailyRow = {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export async function fetchGscDaily(siteUrl: string, startDate: string, endDate: string): Promise<GscDailyRow[]> {
  const api = getSearchConsoleClient();
  const res = await api.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate, endDate,
      dimensions: ['date'],
      rowLimit: 5000
    }
  });
  return (res.data.rows ?? []).map(r => ({
    date: r.keys![0],
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0
  }));
}

export async function fetchGscByPage(siteUrl: string, startDate: string, endDate: string) {
  const api = getSearchConsoleClient();
  const res = await api.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate, endDate,
      dimensions: ['page'],
      rowLimit: 1000
    }
  });
  return (res.data.rows ?? []).map(r => ({
    page: r.keys![0],
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    position: r.position ?? 0
  }));
}

export async function fetchGscByQuery(siteUrl: string, startDate: string, endDate: string) {
  const api = getSearchConsoleClient();
  const res = await api.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate, endDate,
      dimensions: ['query'],
      rowLimit: 2000
    }
  });
  return (res.data.rows ?? []).map(r => ({
    query: r.keys![0],
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    position: r.position ?? 0
  }));
}

// Upserts the previous day's GSC numbers into supabase for one client.
// Run nightly via /api/sync/gsc with a cron service.
export async function syncGscForClient(clientId: string, siteUrl: string, days = 7) {
  const supabase = createSupabaseAdminClient();
  const today = new Date();
  // GSC has ~2 day lag — go back further to backfill any gaps
  const end = new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10);
  const start = new Date(today.getTime() - (days + 2) * 86400000).toISOString().slice(0, 10);

  const daily = await fetchGscDaily(siteUrl, start, end);
  if (daily.length) {
    const rows = daily.map(r => ({
      client_id: clientId,
      date: r.date,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      avg_position: r.position
    }));
    await supabase.from('gsc_daily_snapshot').upsert(rows, { onConflict: 'client_id,date' });
  }

  const today_str = end;
  const pages = await fetchGscByPage(siteUrl, start, end);
  if (pages.length) {
    const rows = pages.map(p => ({
      client_id: clientId, date: today_str,
      page_url: p.page, impressions: p.impressions, clicks: p.clicks, avg_position: p.position
    }));
    await supabase.from('gsc_page_daily').upsert(rows, { onConflict: 'client_id,date,page_url' });
  }

  const queries = await fetchGscByQuery(siteUrl, start, end);
  if (queries.length) {
    const rows = queries.map(q => ({
      client_id: clientId, date: today_str,
      query: q.query, impressions: q.impressions, clicks: q.clicks, avg_position: q.position
    }));
    await supabase.from('gsc_query_daily').upsert(rows, { onConflict: 'client_id,date,query' });
  }

  await supabase
    .from('integrations')
    .update({ last_sync_at: new Date().toISOString(), status: 'connected', last_error: null })
    .eq('client_id', clientId).eq('kind', 'gsc');

  return { daily: daily.length, pages: pages.length, queries: queries.length };
}
