-- ============================================================================
-- D1 Tech Creative — Multi-Tenant SEO Dashboard
-- Schema: organizations (the agency), clients, users, integrations,
-- GSC/GA4 snapshots, page perf, keyword tracking, leads w/ attribution,
-- changelog entries, citation listings.
-- ============================================================================

-- =====================================================
-- 1. CORE: agency, clients, memberships
-- =====================================================

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  website text,
  industry text,
  hq_address text,
  phone text,
  email text,
  brand_primary text default '#025AFA',
  brand_dark text default '#0A2540',
  notes jsonb default '{}'::jsonb,
  engagement_started date,
  created_at timestamptz default now(),
  unique (org_id, slug)
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

do $$ begin
  create type membership_role as enum ('admin','staff','client_viewer');
exception when duplicate_object then null; end $$;

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  role membership_role not null,
  created_at timestamptz default now(),
  check ((org_id is not null and client_id is null) or (client_id is not null)),
  unique (user_id, org_id, client_id)
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  email text not null,
  role membership_role not null,
  token text unique not null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- =====================================================
-- 2. INTEGRATIONS
-- =====================================================

do $$ begin
  create type integration_kind as enum ('gsc','ga4','gbp','bing_wmt','elementor','zapier','cloudflare');
exception when duplicate_object then null; end $$;

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind integration_kind not null,
  status text default 'pending',
  config jsonb default '{}'::jsonb,
  credentials jsonb default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  unique (client_id, kind)
);

-- =====================================================
-- 3. METRICS SNAPSHOTS
-- =====================================================

create table if not exists gsc_daily_snapshot (
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  impressions int not null default 0,
  clicks int not null default 0,
  ctr numeric(6,4) not null default 0,
  avg_position numeric(6,2) not null default 0,
  indexed_pages int,
  primary key (client_id, date)
);

create table if not exists gsc_page_daily (
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  page_url text not null,
  impressions int not null default 0,
  clicks int not null default 0,
  avg_position numeric(6,2) not null default 0,
  primary key (client_id, date, page_url)
);

create table if not exists gsc_query_daily (
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  query text not null,
  impressions int not null default 0,
  clicks int not null default 0,
  avg_position numeric(6,2) not null default 0,
  primary key (client_id, date, query)
);

do $$ begin
  create type keyword_intent as enum ('primary','service','location','condition','commercial','informational','branded');
exception when duplicate_object then null; end $$;

create table if not exists tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  query text not null,
  intent keyword_intent default 'primary',
  cadence text default 'weekly',
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  unique (client_id, query)
);

create table if not exists ga4_daily_snapshot (
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  sessions int not null default 0,
  users int not null default 0,
  organic_sessions int not null default 0,
  conversions int not null default 0,
  engagement_rate numeric(6,4),
  primary key (client_id, date)
);

-- =====================================================
-- 4. LEADS w/ attribution (the killer feature)
-- =====================================================

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  external_id text,

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  fbclid text,
  gclid text,
  msclkid text,
  landing_page text,
  referrer text,

  source_bucket text,           -- organic | paid | social | direct | ai | email | referral

  contact jsonb default '{}'::jsonb,
  payload jsonb default '{}'::jsonb,

  status text default 'new',
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_leads_client_submitted on leads (client_id, submitted_at desc);
create index if not exists idx_leads_source on leads (client_id, source_bucket, submitted_at desc);

-- =====================================================
-- 5. CHANGELOG (the agency's work log)
-- =====================================================

do $$ begin
  create type changelog_kind as enum (
    'audit','page_published','page_updated','redirect_added','schema_deployed',
    'snippet_added','meta_updated','image_optimized','indexing_request',
    'citation_submitted','review_collected','milestone','other'
  );
exception when duplicate_object then null; end $$;

create table if not exists changelog (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  kind changelog_kind not null default 'other',
  title text not null,
  description text,
  related_url text,
  performed_by uuid references auth.users(id),
  client_visible boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_changelog_client_date on changelog (client_id, occurred_at desc);

-- =====================================================
-- 6. CITATIONS, BASELINE, ALERTS
-- =====================================================

create table if not exists citations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  directory_name text not null,
  directory_url text,
  listing_url text,
  claimed boolean default false,
  info_match boolean default false,
  last_verified date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists baseline_snapshot (
  client_id uuid primary key references clients(id) on delete cascade,
  captured_on date not null,
  metrics jsonb not null,
  notes text
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind text not null,
  severity text default 'info',
  title text not null,
  detail jsonb default '{}'::jsonb,
  triggered_at timestamptz default now(),
  acknowledged boolean default false
);

-- =====================================================
-- 7. RLS
-- =====================================================

alter table organizations enable row level security;
alter table clients enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table integrations enable row level security;
alter table gsc_daily_snapshot enable row level security;
alter table gsc_page_daily enable row level security;
alter table gsc_query_daily enable row level security;
alter table tracked_keywords enable row level security;
alter table ga4_daily_snapshot enable row level security;
alter table leads enable row level security;
alter table changelog enable row level security;
alter table citations enable row level security;
alter table baseline_snapshot enable row level security;
alter table alerts enable row level security;

create or replace function current_user_is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and m.role in ('admin','staff')
      and m.org_id is not null
  );
$$;

create or replace function current_user_can_see_client(target_client uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and (
        (m.role in ('admin','staff') and m.org_id is not null)
        or (m.role = 'client_viewer' and m.client_id = target_client)
      )
  );
$$;

create policy "profile self read"   on profiles for select using (user_id = auth.uid());
create policy "profile self update" on profiles for update using (user_id = auth.uid());
create policy "profile self insert" on profiles for insert with check (user_id = auth.uid());

create policy "org members read" on organizations for select using (
  exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.org_id = organizations.id and m.role in ('admin','staff')
  )
);

create policy "clients read" on clients for select using (current_user_can_see_client(clients.id));
create policy "clients write" on clients for all using (current_user_is_admin()) with check (current_user_is_admin());

do $$
declare t text;
begin
  for t in select unnest(array[
    'integrations','gsc_daily_snapshot','gsc_page_daily','gsc_query_daily',
    'tracked_keywords','ga4_daily_snapshot','leads','changelog','citations',
    'baseline_snapshot','alerts'
  ]) loop
    execute format('create policy "%s read" on %s for select using (current_user_can_see_client(%s.client_id));', t, t, t);
    execute format('create policy "%s write" on %s for all using (current_user_is_admin()) with check (current_user_is_admin());', t, t);
  end loop;
end$$;

create policy "memberships self read"  on memberships for select using (user_id = auth.uid() or current_user_is_admin());
create policy "memberships admin all"  on memberships for all using (current_user_is_admin()) with check (current_user_is_admin());
create policy "invitations admin all"  on invitations for all using (current_user_is_admin()) with check (current_user_is_admin());

-- =====================================================
-- 8. VIEWS
-- =====================================================

create or replace view v_kpi_periods as
  select client_id,
    sum(impressions) filter (where date >= current_date - interval '7 days')  as impressions_7d,
    sum(clicks)      filter (where date >= current_date - interval '7 days')  as clicks_7d,
    sum(impressions) filter (where date >= current_date - interval '28 days') as impressions_28d,
    sum(clicks)      filter (where date >= current_date - interval '28 days') as clicks_28d,
    sum(impressions) filter (where date >= current_date - interval '90 days') as impressions_90d,
    sum(clicks)      filter (where date >= current_date - interval '90 days') as clicks_90d,
    avg(avg_position) filter (where date >= current_date - interval '28 days') as avg_pos_28d
  from gsc_daily_snapshot
  group by client_id;

create or replace view v_lead_source_breakdown_28d as
  select client_id,
         coalesce(source_bucket,'direct') as source_bucket,
         count(*) as leads
  from leads
  where submitted_at >= current_date - interval '28 days'
  group by client_id, coalesce(source_bucket,'direct');
