-- ============================================================================
-- Migration 0002 — state tables used by the auto-watchers.
-- These store the *previous* state so each cron run can diff and emit only
-- the deltas as changelog entries.
-- ============================================================================

-- Snapshot of each WordPress post/page we've seen, used to detect "new" and
-- "edited" entries on the next poll.
create table if not exists wp_snapshot (
  client_id uuid not null references clients(id) on delete cascade,
  wp_id int  not null,                 -- WordPress post id
  wp_type text not null,               -- 'page' | 'post' | 'product' | ...
  slug text,
  link text,
  title text,
  modified_at timestamptz,
  title_md5 text,                      -- detect title changes
  content_md5 text,                    -- detect content changes
  aioseo_title text,                   -- AIOSEO meta title
  aioseo_description text,             -- AIOSEO meta desc
  aioseo_md5 text,                     -- detect meta changes
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  primary key (client_id, wp_id)
);

-- Snapshot of WPCode snippets so we know when a new one goes active.
create table if not exists wpcode_snapshot (
  client_id uuid not null references clients(id) on delete cascade,
  snippet_id int not null,
  title text,
  active boolean,
  modified_at timestamptz,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  primary key (client_id, snippet_id)
);

-- Snapshot of media library alt-text coverage.
create table if not exists wp_media_snapshot (
  client_id uuid primary key references clients(id) on delete cascade,
  total_images int not null default 0,
  with_alt int not null default 0,
  measured_at timestamptz default now()
);

-- Last-seen state per tracked keyword (used by GSC delta watcher).
create table if not exists keyword_rank_state (
  client_id uuid not null references clients(id) on delete cascade,
  query text not null,
  last_position numeric(6,2),
  last_impressions int,
  last_clicks int,
  last_seen_date date,
  primary key (client_id, query)
);

-- Last-seen indexed-page set (used to detect "newly indexed" events).
create table if not exists indexed_page_state (
  client_id uuid not null references clients(id) on delete cascade,
  page_url text not null,
  first_indexed_at date default current_date,
  last_seen_at date default current_date,
  primary key (client_id, page_url)
);

-- Bookkeeping: when did each watcher last run for each client?
create table if not exists watcher_run (
  client_id uuid not null references clients(id) on delete cascade,
  watcher text not null,               -- 'wp' | 'gsc_delta' | 'cf' | ...
  last_run_at timestamptz default now(),
  last_status text default 'ok',
  last_detail jsonb default '{}'::jsonb,
  primary key (client_id, watcher)
);

-- RLS — these are write-by-system, read-by-admin tables.
alter table wp_snapshot         enable row level security;
alter table wpcode_snapshot     enable row level security;
alter table wp_media_snapshot   enable row level security;
alter table keyword_rank_state  enable row level security;
alter table indexed_page_state  enable row level security;
alter table watcher_run         enable row level security;

do $$ declare t text; begin
  for t in select unnest(array['wp_snapshot','wpcode_snapshot','wp_media_snapshot','keyword_rank_state','indexed_page_state','watcher_run']) loop
    execute format('create policy "%s admin all" on %s for all using (current_user_is_admin()) with check (current_user_is_admin());', t, t);
  end loop;
end $$;
