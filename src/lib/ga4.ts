// GA4 wrapper — Analytics Data API v1beta.
// Each client integration row stores `config.property_id` (e.g. "properties/123456789").

import { google } from 'googleapis';
import { createSupabaseAdminClient } from './supabase/server';

function getAnalyticsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
  });
  return google.analyticsdata({ version: 'v1beta', auth });
}

export async function fetchGa4Daily(propertyId: string, startDate: string, endDate: string) {
  const api = getAnalyticsClient();
  const res = await api.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'conversions' },
        { name: 'engagementRate' }
      ]
    }
  });

  // aggregate by date, separate organic
  const byDate = new Map<string, any>();
  for (const row of res.data.rows ?? []) {
    const date = row.dimensionValues?.[0]?.value!;
    const channel = (row.dimensionValues?.[1]?.value ?? '').toLowerCase();
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    const users = Number(row.metricValues?.[1]?.value ?? 0);
    const conv = Number(row.metricValues?.[2]?.value ?? 0);
    const engagement = Number(row.metricValues?.[3]?.value ?? 0);
    const isoDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
    const acc = byDate.get(isoDate) ?? { sessions:0, users:0, organic_sessions:0, conversions:0, engagement:0, weight:0 };
    acc.sessions += sessions;
    acc.users += users;
    acc.conversions += conv;
    acc.engagement += engagement * sessions;
    acc.weight += sessions;
    if (channel.includes('organic')) acc.organic_sessions += sessions;
    byDate.set(isoDate, acc);
  }
  return Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    sessions: v.sessions,
    users: v.users,
    organic_sessions: v.organic_sessions,
    conversions: v.conversions,
    engagement_rate: v.weight ? v.engagement / v.weight : 0
  }));
}

export async function syncGa4ForClient(clientId: string, propertyId: string, days = 7) {
  const supabase = createSupabaseAdminClient();
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10);
  const rows = await fetchGa4Daily(propertyId, start, end);
  if (rows.length) {
    const payload = rows.map(r => ({ client_id: clientId, ...r }));
    await supabase.from('ga4_daily_snapshot').upsert(payload, { onConflict: 'client_id,date' });
  }
  await supabase
    .from('integrations')
    .update({ last_sync_at: new Date().toISOString(), status: 'connected', last_error: null })
    .eq('client_id', clientId).eq('kind', 'ga4');
  return { rows: rows.length };
}
