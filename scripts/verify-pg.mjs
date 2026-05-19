// End-to-end Postgres verification.
// Boots an embedded Postgres (pglite), stubs auth.uid() so RLS helper
// functions compile, applies both migrations, runs the seed, and executes
// the queries the dashboard uses to render the client overview.
//
// Run with:  node scripts/verify-pg.mjs

import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const m1   = fs.readFileSync(path.join(root, 'supabase/migrations/0001_init.sql'), 'utf8');
const m2   = fs.readFileSync(path.join(root, 'supabase/migrations/0002_automation.sql'), 'utf8');
const seed = fs.readFileSync(path.join(root, 'supabase/seed.sql'), 'utf8');

const db = new PGlite();

console.log('▶ boot pglite + stub the Supabase auth schema');
await db.exec(`
  create schema if not exists auth;
  create table if not exists auth.users ( id uuid primary key default gen_random_uuid() );
  create or replace function auth.uid() returns uuid language sql stable as $fn$ select null::uuid $fn$;
`);

console.log('▶ apply migration 0001_init.sql');
await db.exec(m1);
console.log('▶ apply migration 0002_automation.sql');
await db.exec(m2);
console.log('▶ apply seed.sql');
await db.exec(seed);

console.log('\n================  RESULTS  ================');

const tableCount = await db.query(`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
console.log('public tables created:', tableCount.rows[0].n);

const policyCount = await db.query(`select count(*)::int as n from pg_policies where schemaname = 'public'`);
console.log('RLS policies created:', policyCount.rows[0].n);

const clients = await db.query(`select name, slug, website, engagement_started::text as engagement_started from clients order by name`);
console.log('\nclients:');
for (const r of clients.rows) console.log(' •', r.name, '·', r.website, '· since', r.engagement_started);

const kpi = await db.query(`
  select c.name, k.impressions_7d, k.impressions_28d, k.clicks_28d, round(k.avg_pos_28d::numeric, 1) as avg_pos
  from v_kpi_periods k join clients c on c.id = k.client_id
  order by c.name
`);
console.log('\nv_kpi_periods (KPI cards on the overview):');
console.table(kpi.rows);

const tracked = await db.query(`
  select c.slug, count(*)::int as tracked_keywords
  from tracked_keywords t join clients c on c.id = t.client_id
  group by c.slug order by c.slug
`);
console.log('\ntracked keywords per client:');
console.table(tracked.rows);

const changelog = await db.query(`
  select c.slug, count(*)::int as entries, max(ch.occurred_at)::text as latest
  from changelog ch join clients c on c.id = ch.client_id
  group by c.slug order by entries desc
`);
console.log('\nchangelog volume:');
console.table(changelog.rows);

const seoLeads = await db.query(`
  select c.slug,
    count(*) filter (where l.source_bucket in ('organic','ai'))::int as seo_28d,
    count(*) filter (where l.source_bucket = 'paid')::int                as paid_28d,
    count(*) filter (where l.source_bucket = 'direct')::int              as direct_28d,
    count(*)::int                                                        as total_28d
  from leads l join clients c on c.id = l.client_id
  group by c.slug order by c.slug
`);
console.log('\nSEO leads vs total — headline KPI on the client overview:');
console.table(seoLeads.rows);

const baselineCompare = await db.query(`
  select c.name,
    b.metrics->>'pages_indexed' as baseline_pages_indexed,
    b.metrics->>'impressions_90d' as baseline_imp_90d,
    k.impressions_90d as current_imp_90d
  from clients c
  left join baseline_snapshot b on b.client_id = c.id
  left join v_kpi_periods    k on k.client_id = c.id
  order by c.name
`);
console.log('\nbaseline → current (drives "where you started vs where you are"):');
console.table(baselineCompare.rows);

const recentAuto = await db.query(`
  select c.slug, ch.kind, ch.title
  from changelog ch join clients c on c.id = ch.client_id
  order by ch.occurred_at desc limit 6
`);
console.log('\n6 most recent changelog entries (client feed):');
console.table(recentAuto.rows);

const freshness = await db.query(`
  select c.slug,
    (select max(date)::text from gsc_daily_snapshot s where s.client_id = c.id) as latest_gsc_date,
    (select count(*)::int from gsc_page_daily p where p.client_id = c.id) as gsc_page_rows,
    (select count(*)::int from gsc_query_daily q where q.client_id = c.id) as gsc_query_rows
  from clients c order by c.slug
`);
console.log('\nfreshness-bar source counts:');
console.table(freshness.rows);

await db.close();
console.log(