# Automation — how the changelog fills itself

The whole point of the dashboard is that **you never type a daily update**. The agency does SEO work the way you already do it — publishing pages in WordPress, rewriting AIOSEO meta, deploying WPCode snippets, force-indexing via GSC. The dashboard watches all of that automatically and turns each detected change into a client-visible changelog entry.

There are 6 sources feeding the changelog. You enable whichever ones make sense per client.

---

## Source 1 — WordPress watcher (the workhorse)

**File:** `src/lib/wp-watcher.ts`
**Cron:** `*/30 * * * *` (every 30 min, `/api/sync/wp`)
**Auth:** WordPress Application Password (built-in since WP 5.6, no plugin needed)

**What it detects, every 30 min:**

| Detected change | Changelog entry produced |
|---|---|
| New pages or posts since last run | `page_published` — "N new pages published" with titles |
| Existing pages or posts whose content hash changed | `page_updated` — "N pages updated" |
| AIOSEO title or description changed on an existing page | `meta_updated` — "N AIOSEO titles/descriptions rewritten" |
| WPCode snippet went from inactive → active | `snippet_added` — "N WPCode snippets activated" with titles |
| 10+ more media items gained alt text since last run | `image_optimized` — "Alt text added to N images" |

**How to enable for a client:**

1. In WordPress admin: Users → Profile → Application Passwords. Generate one named "D1 Dashboard". Copy the 24-char password.
2. In Supabase SQL editor:
   ```sql
   update integrations
   set config      = config      || jsonb_build_object('wp_base_url','https://example.com'),
       credentials = credentials || jsonb_build_object('app_user','daniel','app_pass','xxxx xxxx xxxx xxxx')
   where client_id = '<id>' and kind = 'elementor';
   ```
3. Wait 30 minutes. First run snapshots the entire state and emits **no** changelog entries (otherwise the client would see "232 pages published" on day 1). Every run after that emits only deltas.

**Why it's reliable:**
- All diffs are content-hash based (md5 of title + body, md5 of aioseo title + description). No false positives from cache busts or unrelated meta changes.
- Pagination is capped at 2000 posts/pages and 3000 media items per type to avoid runaway loops.
- Each run upserts the snapshot, so even if a run fails halfway, the next one resumes cleanly.

---

## Source 2 — GSC delta watcher

**File:** `src/lib/gsc-watcher.ts`
**Cron:** nightly at 9:30 AM UTC (`/api/watch/gsc`, scheduled 30 min after the GSC sync so it has fresh data to diff)

**What it detects:**

| Detected change | Changelog entry produced |
|---|---|
| A page URL appeared in GSC for the first time | `indexing_request` — "N new pages appeared in Google's index" |
| Total indexed-page count crosses a milestone threshold (+10, +25, +50, +100, +200, +500 since baseline) | `milestone` — "+50 pages indexed since baseline (now 90)" |
| Tracked keyword position improved 5+ spots vs. previous run | `milestone` — "N tracked keywords jumped 5+ positions" with the queries |
| Tracked keyword position dropped 5+ spots | (alert row, not changelog — clients don't need to see the dips) |
| Last 7 days' avg impressions ≥ 1.5× the 28-day baseline | `milestone` — "Impression spike: last 7 days 1.5× the 28-day average" |

State lives in `keyword_rank_state` and `indexed_page_state`. The first run after a client onboards seeds the state, the second run starts diffing.

---

## Source 3 — Claude session hook (for strategic work)

When you do SEO work *inside a Claude chat* — running an audit, drafting a keyword spec, writing a developer handoff — that work doesn't leave a digital footprint on the live site, so the WP watcher can't see it.

Easy fix: have Claude POST a summary to the dashboard at session end.

Drop this into the client's `CLAUDE.md` (or the agency-wide one):

```markdown
## Dashboard logging

After completing any client SEO work in this chat, POST a one-line summary to
the D1 dashboard so the client's changelog stays current:

curl -X POST https://<dashboard>/api/ingest/changelog \
  -H "Content-Type: application/json" \
  -H "x-api-token: $D1_DASHBOARD_TOKEN" \
  -d '{
    "client_slug": "mary-angels",
    "kind": "audit | page_updated | indexing_request | milestone | other",
    "title": "<one-line summary of what was done>",
    "description": "<optional 1-2 sentence detail>"
  }'

Only do this for substantive work (auditing, planning, batching changes).
Don't log every micro-edit — that's what the WP watcher catches automatically.
```

Pick `kind` based on what was done — see the enum in the migration. Use `milestone` for "we completed phase 2 of the engagement", `audit` for "ran the day-1 audit", etc.

---

## Source 4 — Cloudflare cache-purge webhook

**Endpoint:** `POST /api/ingest/cloudflare` with header `x-webhook-secret`

Every time you purge a Cloudflare cache, it's almost always because you just shipped a change. The webhook turns that signal into a `Site cache refreshed` entry.

**Setup in Cloudflare:**
Notifications → Create → Workers/Cache Purge → Webhook destination:
```
URL: https://<dashboard>/api/ingest/cloudflare
Headers: x-webhook-secret: <your LEAD_WEBHOOK_SECRET>
```

Cloudflare sends the zone name in the payload; the receiver matches it to a client by `website` substring.

---

## Source 5 — GSC URL Inspection trail

When you submit a URL via GSC URL Inspection ("Request Indexing"), GSC doesn't have a webhook. But if you're submitting via the **URL Inspection API** (programmatic), it's easy to log:

```typescript
// inside your inspection wrapper
await supabase.from('changelog').insert({
  client_id, kind: 'indexing_request',
  title: `Indexing requested for ${url}`,
  metadata: { auto: true, source: 'gsc_url_inspection' }
});
```

If you're using the GSC UI manually, leave this disabled and let the watcher pick up the result a few days later when the URL actually shows up indexed.

---

## Source 6 — Manual form (the fallback)

For the rare strategic work that doesn't show up anywhere automatically — running a competitor analysis, writing a content plan, holding a strategy call — use `/admin/changelog` and fill the form. Should be **less than 10% of total entries** once the watchers are running.

---

## Per-client setup checklist

For each new client, enable the auto-sources that apply:

| Source | Requires | Effort |
|---|---|---|
| WP watcher | WP Application Password | 5 min |
| GSC delta watcher | service-account already on GSC | 0 (auto-enabled once GSC integration is connected) |
| Claude session hook | one line in CLAUDE.md + agency token | 1 min |
| Cloudflare webhook | Cloudflare account access | 3 min |
| Manual form | nothing — always available | n/a |

**Realistic mix** for an active engagement like A Plus:
- WP watcher: ~6 entries per active week (new pages, meta rewrites, snippet deploys)
- GSC delta: ~2 entries per week (indexing milestones, rank jumps)
- Claude session hook: ~1–3 entries per audit/strategy session
- Cloudflare webhook: 1 per deploy day
- Manual: maybe 1 per month

≈ 90% of entries auto-populated. Phil and Maria see continuous progress; you never touch the dashboard.

---

## Observability — is it working?

`/admin/automation` shows per-client watcher status:
- Last run timestamp + ok/error per watcher
- Auto-entry count over the last 7 days

If a watcher shows red, expand the row to see the `last_detail.error` JSON. Usual culprits:
- WP Application Password revoked or expired → regenerate
- GSC service account removed from a client property → re-add as Restricted user
- WPCode REST API disabled → toggle WPCode → Settings → REST API on

---

## Privacy + safety notes

- **The watcher only reads**. It never writes to the client's WordPress, Cloudflare, or GSC.
- **Credentials are stored per-client** in the `integrations.credentials` jsonb column, RLS-protected to admin only. Encrypt at rest with Supabase Vault for production.
- **Client never sees credentials**. RLS blocks them from reading the integrations table.
- **Sensitive content in changelog**. Watcher entries only include titles + counts — no full body content. So even if a client's CMS has internal drafts, the changelog won't leak them.
