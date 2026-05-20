# D1 SEO Dashboard

The third D1TechCreative app — sibling to **d1app** (Workspace CRM) and **d1-affiliates** (Referral program). Client-facing SEO performance + auto-changelog dashboard. Pilot clients: **A Plus Moving & Storage** and **Mary Angels Home Care**.

Visual sibling: same dark navy + blue brand palette as the other two D1 apps, same mascot, same welcome card, same focus rings, same notification system. Per the D1 handoff brief: no purple/violet, sky-* for the secondary blue, DM Sans, dark surfaces, brand glow on auth pages.

Tech stack (aligned with d1app + d1-affiliates where it makes sense; this app stays focused on Google + WordPress):
- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind v4**
- **Supabase** — Postgres, RLS, magic-link auth via Resend SMTP
- **Vercel Hobby** — daily crons (see `docs/CRON.md` for sub-daily polling)
- **Resend** — transactional email (auth + digests)
- **googleapis** — GSC + GA4 ingestion
- **WordPress REST + d1-shim.php** — pages, posts, AIOSEO meta, WPCode snippets, form submissions

GHL is intentionally *not* wired into this app. CRM/lead-pipeline pushes belong in d1-affiliates. This app's job is "show the SEO journey and surface qualified leads" — not "manage the sales funnel".

---

## 1. What this gives you out of the box

Agency-side (`/admin`):
- List of all clients with 28-day KPI snapshot
- Per-client detail view: baseline, KPIs, full changelog, leads, top queries, top pages
- A simple form to post a changelog entry (or hit `/api/ingest/changelog` programmatically from Claude sessions)
- Invite flow that creates a `memberships` row tying a client viewer email to one client

Client-side (`/dashboard`):
- KPI cards (7d / 28d / 90d impressions, clicks, avg position)
- "Where you started vs. where you are" — baseline vs current
- Recent changelog feed (only entries marked `client_visible`)
- Latest leads + 28-day source mix (organic / paid / social / direct / ai / referral)
- Tracked keywords table
- Top pages table

API:
- `POST /api/ingest/lead`        — Elementor webhook receiver, derives `source_bucket`
- `POST /api/ingest/changelog`   — programmatic work-log entries
- `GET/POST /api/sync/gsc`       — nightly cron — pulls last 7 days of GSC data for every connected client
- `GET/POST /api/sync/ga4`       — nightly cron — pulls last 7 days of GA4 data

---

## 2. Local setup

```bash
# 1. install
npm install

# 2. create a Supabase project, then copy keys into .env.local
cp .env.example .env.local
# edit .env.local

# 3. run migrations + seed (use Supabase Studio's SQL editor, or psql)
#    a) paste contents of supabase/migrations/0001_init.sql
#    b) paste contents of supabase/seed.sql

# 4. create yourself as the agency admin (in SQL editor)
#    you'll need your auth.uid() — sign in once via /login, then run:
#
#    insert into memberships (user_id, org_id, role)
#    values ('<your-auth-uid>', '00000000-0000-0000-0000-00000000d1d1', 'admin');

# 5. run
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login`. Magic-link in, and you'll land on `/admin`.

---

## 3. Connecting a client's Google Search Console

Two options:

**Option A — Service account (recommended for the agency).**
1. Create a Google Cloud project. Enable the **Search Console API** and **Google Analytics Data API**.
2. Create a Service Account, download its JSON key.
3. Put the email + private key into `.env.local` (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`).
4. In the client's Search Console, add the service-account email as a user with at least "Restricted" access. Same for their GA4 property (Viewer).
5. In the dashboard's `integrations` table, insert:
   ```sql
   insert into integrations (client_id, kind, status, config)
   values ('<client_id>', 'gsc', 'connected',
           jsonb_build_object('site_url','sc-domain:aplusmovingandstorage.co'));
   ```
   For URL-prefix properties use `'https://aplusmovingandstorage.co/'` (with trailing slash).
6. Trigger a manual sync to verify:
   ```bash
   curl "https://your-app.vercel.app/api/sync/gsc?token=$CRON_SECRET"
   ```

**Option B — Per-client OAuth.** Stubbed for v2.

---

## 4. Wiring the Elementor lead form

In Elementor's form **Actions After Submit**, add a **Webhook** that POSTs to:

```
https://your-app.vercel.app/api/ingest/lead
```

Headers:
```
Content-Type: application/json
x-webhook-secret: <LEAD_WEBHOOK_SECRET>
```

Make sure each form has all 10 hidden attribution fields populated by WPCode snippet 5820 (already in place for A Plus). The webhook receiver:
- accepts whatever payload Elementor sends (loose schema),
- normalizes the 10 attribution fields,
- derives `source_bucket` via `src/lib/attribution.ts`,
- writes a row to `leads`.

> **Tip.** Set `client_slug` (e.g. `"a-plus-moving"`) as a hidden form field — the webhook uses it to route to the right client.

---

## 5. Programmatic changelog from Claude sessions

When a Claude session ships SEO work for a client, it can POST to the changelog API directly:

```bash
curl -X POST https://your-app.vercel.app/api/ingest/changelog \
  -H "Content-Type: application/json" \
  -H "x-api-token: $CRON_SECRET" \
  -d '{
    "client_slug": "mary-angels",
    "kind": "meta_updated",
    "title": "75 pages: AIOSEO titles + meta descriptions rewritten",
    "description": "Homepage + 4 main service + 21 neighborhood + 14 conditions + 6 resources + 20 combos + 8 other.",
    "occurred_at": "2026-05-18T17:00:00Z"
  }'
```

That keeps the changelog auto-populated as work ships — no manual data entry.

---

## 6. Deploying

```bash
# Push to GitHub, then deploy via Vercel:
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CRON_SECRET
vercel env add LEAD_WEBHOOK_SECRET
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel deploy --prod
```

In Vercel → Project → Crons, confirm `/api/sync/gsc` and `/api/sync/ga4` are scheduled. (Pass `CRON_SECRET` via header rewrite or by inserting it directly in `vercel.json` — never commit it.)

---

## 7. Add a new client

```sql
insert into clients (org_id, name, slug, website, industry, phone, email, engagement_started)
values ('00000000-0000-0000-0000-00000000d1d1',
        'New Client LLC', 'new-client',
        'https://example.com',
        'Industry', '555-555-5555', 'owner@example.com',
        current_date);

-- baseline (day 1 numbers)
insert into baseline_snapshot (client_id, captured_on, metrics)
select id, current_date, jsonb_build_object('pages_indexed', 12, 'impressions_90d', 250, 'avg_ranking_position', 38)
from clients where slug = 'new-client';

-- integrations
insert into integrations (client_id, kind, status, config)
select id, 'gsc', 'pending', jsonb_build_object('site_url','sc-domain:example.com')
from clients where slug = 'new-client';
```

Then create an invitation for the client owner via `/admin/invites`.

---

## 8. What's deliberately not in MVP (yet)

- **Bing Webmaster Tools** sync — wire after Phil shares his Microsoft creden
<!-- deploy trigger: 2026-05-20T00:03:49.491Z -->
