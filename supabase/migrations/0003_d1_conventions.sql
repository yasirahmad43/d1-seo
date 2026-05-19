-- ============================================================================
-- Migration 0003 — align with D1TechCreative app conventions (d1app +
-- d1-affiliates). Adds:
--   • `users` table extending auth.users with role + display fields
--   • updated_at columns + triggers on every domain table
--   • notification_preferences + notifications (mirrors d1app)
--   • deleted_items soft-delete snapshot pattern (mirrors d1app 0003)
-- ============================================================================

-- =====================================================
-- 1. USERS table (the D1 pattern — auth.users + role)
-- =====================================================
-- Both existing apps store role on a `users` row, not on a membership row.
-- For the multi-tenant SEO tracker we keep `memberships` for per-client
-- access AND add `users` for the global identity + role of D1 staff.

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin','staff','member','client_viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users enable row level security;

-- Drop existing self-policies from `profiles` and migrate to `users`.
-- (Profiles still exists and is kept for backwards compatibility — applications
-- should prefer `users` going forward.)
do $$ begin
  insert into users (id, email, full_name, avatar_url, created_at)
  select user_id, email, full_name, avatar_url, created_at from profiles
  on conflict (id) do nothing;
end $$;

create policy "users self read"   on users for select using (id = auth.uid());
create policy "users self update" on users for update using (id = auth.uid());
create policy "users admin all"   on users for all using (
  exists (select 1 from users u where u.id = auth.uid() and u.role in ('admin','staff'))
) with check (
  exists (select 1 from users u where u.id = auth.uid() and u.role in ('admin','staff'))
);

-- =====================================================
-- 2. updated_at triggers everywhere
-- =====================================================
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- Add updated_at where it's missing, then install the trigger.
do $$
declare
  t text;
  has_col boolean;
begin
  for t in select unnest(array[
    'clients','integrations','tracked_keywords','leads','changelog','citations',
    'baseline_snapshot','alerts','users','wp_snapshot','wpcode_snapshot',
    'wp_media_snapshot','keyword_rank_state','indexed_page_state','watcher_run'
  ]) loop
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='updated_at'
    ) into has_col;
    if not has_col then
      execute format('alter table %I add column updated_at timestamptz not null default now()', t);
    end if;
    execute format(
      'drop trigger if exists trg_set_updated_at on %I;
       create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end$$;

-- =====================================================
-- 3. Notification system
-- =====================================================
-- Per-event boolean preferences, default true.
create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  new_lead boolean not null default true,
  rank_gain boolean not null default true,
  rank_drop boolean not null default true,
  milestone boolean not null default true,
  weekly_digest boolean not null default true,
  monthly_digest boolean not null default true,
  watcher_error boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

alter table notification_preferences enable row level security;
alter table notifications enable row level security;

create policy "prefs self all"   on notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif self read"  on notifications for select using (user_id = auth.uid());
create policy "notif self mark"  on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif admin all"  on notifications for all using (
  exists (select 1 from users u where u.id = auth.uid() and u.role in ('admin','staff'))
) with check (
  exists (select 1 from users u where u.id = auth.uid() and u.role in ('admin','staff'))
);

-- Trigger on the trigger table to set updated_at
create trigger trg_prefs_updated_at before update on notification_preferences for each row execute function set_updated_at();

-- =====================================================
-- 4. Soft-delete snapshot (d1app migration 0003 pattern)
-- =====================================================
create table if not exists deleted_items (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid not null,
  payload jsonb not null,
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz not null default now(),
  client_id uuid references clients(id) on delete cascade,
  -- A trash-bin TTL — default 30 days, agency can extend per row.
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_deleted_items_table on deleted_items (table_name, row_id);
create index if not exists idx_deleted_items_client on deleted_items (client_id, deleted_at desc);

alter table deleted_items enable row level security;
create policy "deleted_items admin all" on deleted_items for all using (
  exists (select 1 from users u where u.id = auth.uid() and u.role in ('admin','staff'))
) with check (
  exists (select 1 from users u where u.id = auth.uid() and u.role in ('admin','staff'))
);
