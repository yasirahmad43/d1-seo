# D1 Shim — one-time WordPress setup per client

`d1-shim.php` is a tiny PHP snippet that exposes 3 read-only endpoints on a client's WordPress so the D1 dashboard can automatically pull form submissions, WPCode snippet status, and a health-check ping every 30 minutes.

This replaces the need to manually configure an Elementor webhook on each client site. After this is installed once, leads flow into the dashboard automatically — the webhook becomes optional.

## Install (5 minutes, per client)

1. Generate a random 32+ char secret. Example: `openssl rand -hex 24`.
2. In `d1-shim.php`, replace `REPLACE_WITH_RANDOM_32_CHAR_SECRET` with your secret.
3. WP admin → WPCode → Add Snippet → "PHP Snippet" → paste the file.
4. Set "Insertion" to **Run Everywhere**. Activate.
5. In the dashboard's Supabase SQL editor:
   ```sql
   update integrations
   set credentials = credentials || jsonb_build_object('shim_token','<your secret>')
   where client_id = '<id>' and kind = 'elementor';
   ```
6. Verify by hitting:
   ```bash
   curl -H "X-D1-Token: <secret>" https://example.com/wp-json/d1/v1/ping
   ```
   You should see `{"ok":true,...}`.

The next scheduled WP watcher run (within 30 min) pulls submissions and starts logging them as leads in the dashboard.

## What the endpoints do

| Endpoint | Returns |
|---|---|
| `GET /wp-json/d1/v1/ping` | `{ok: true, site, time}` — health check |
| `GET /wp-json/d1/v1/submissions?since=<unix>` | `wp_e_submissions` rows + their field values since the timestamp. Includes the 10 attribution fields if WPCode 5820 is in place. |
| `GET /wp-json/d1/v1/wpcode-snippets` | List of WPCode snippets — id, title, active state, modified time. No source code. |

## Security

- Token in `X-D1-Token` header; anything else returns 401.
- Comparison is `hash_equals()` (constant-time, no timing leak).
- No write endpoints. Read-only by design.
- No source code or post body ever leaves WordPress — only metadata + form-submission field values.
