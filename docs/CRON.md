# Cron scheduling

Vercel **Hobby plan only allows daily crons.** `*/30 * * * *` is rejected at build time. Both existing D1 apps (d1app, d1-affiliates) are on Hobby and stick to daily.

For the SEO dashboard, daily is fine for everything *except* the WP watcher, which we'd ideally run every 30 minutes so submissions land near-real-time. Two options:

## Option A — keep it on Hobby + external scheduler (recommended)

[cron-job.org](https://cron-job.org) is free, lets you schedule down to every minute, and works perfectly for hitting an HTTP endpoint.

1. Sign up at cron-job.org (free).
2. Create a job:
   - **URL:** `https://<your-app>.d1techcreative.com/api/sync/wp?token=$CRON_SECRET`
   - **Schedule:** `*/30 * * * *`
   - **HTTP method:** GET
3. Save. Done.

Repeat for `/api/watch/gsc` if you want the GSC delta watcher to run more often than daily.

## Option B — upgrade to Vercel Pro

`$20/mo`. Then edit `vercel.json`:

```diff
- { "path": "/api/sync/wp", "schedule": "0 8 * * *" }
+ { "path": "/api/sync/wp", "schedule": "*/30 * * * *" }
```

## Current Vercel cron schedule (Hobby-safe)

| Path | Schedule | What it does |
|---|---|---|
| `/api/sync/wp`   | `0 8 * * *`  | Once daily — pulls WP pages, posts, AIOSEO meta, snippets, media coverage, form submissions |
| `/api/sync/gsc`  | `0 9 * * *`  | Once daily — last 7 days of GSC data |
| `/api/sync/ga4`  | `5 9 * * *`  | Once daily — last 7 days of GA4 data |
| `/api/watch/gsc` | `30 9 * * *` | Once daily — delta detection (newly indexed, rank gains/drops, milestones) |

## Why these times

09:00 UTC = 04:00 EST / 02:00 PST. Quiet hours for both coasts so clients open the dashboard to fresh data when their day starts.

## Quick test

After deploy, manually trigger to verify wiring:

```bash
curl "https://<your-app>/api/sync/wp?token=$CRON_SECRET"
curl "https://<your-app>/api/sync/gsc?token=$CRON_SECRET"
```

Both should return `{ "ok": true, "results": [...] }`. If you get 401, check that the `CRON_SECRET` env var matches.
