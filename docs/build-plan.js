// Generates the architecture & build-plan .docx for the D1 SEO Dashboard.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, PageOrientation, ExternalHyperlink,
  TableOfContents, PageNumber, Header, Footer
} = require('docx');

const FONT = 'Arial';
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

const H1 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true, font: FONT })] });
const H2 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true, font: FONT })] });
const H3 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, bold: true, font: FONT })] });
const P  = (text, opts = {}) =>
  new Paragraph({ children: [new TextRun({ text, font: FONT, ...opts })], spacing: { after: 120 } });
const Bullet = (text) =>
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text, font: FONT })] });
const Spacer = () => new Paragraph({ children: [new TextRun({ text: ' ', font: FONT })] });

function cell(text, opts = {}) {
  const { bold = false, shade = null, width = 4680, align = AlignmentType.LEFT } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, font: FONT, bold, size: 20 })] })]
  });
}

function twoColTable(rows, headerShade = 'EBF2FF') {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 6240],
    rows: [
      new TableRow({
        children: [
          cell(rows[0][0], { bold: true, shade: headerShade, width: 3120 }),
          cell(rows[0][1], { bold: true, shade: headerShade, width: 6240 })
        ]
      }),
      ...rows.slice(1).map(r => new TableRow({
        children: [cell(r[0], { width: 3120 }), cell(r[1], { width: 6240 })]
      }))
    ]
  });
}

function fourColTable(rows, widths = [2340, 2340, 2340, 2340], headerShade = 'EBF2FF') {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: rows[0].map((t, i) => cell(t, { bold: true, shade: headerShade, width: widths[i] }))
      }),
      ...rows.slice(1).map(r => new TableRow({
        children: r.map((t, i) => cell(t, { width: widths[i] }))
      }))
    ]
  });
}

function threeColTable(rows, widths = [2340, 3120, 3900], headerShade = 'EBF2FF') {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: rows[0].map((t, i) => cell(t, { bold: true, shade: headerShade, width: widths[i] }))
      }),
      ...rows.slice(1).map(r => new TableRow({
        children: r.map((t, i) => cell(t, { width: widths[i] }))
      }))
    ]
  });
}

const titlePage = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 240 },
    children: [new TextRun({ text: 'D1 Tech Creative', bold: true, size: 56, font: FONT, color: '025AFA' })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 360 },
    children: [new TextRun({ text: 'Multi-Tenant SEO Dashboard', bold: true, size: 44, font: FONT, color: '0A2540' })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Architecture, Data Model & 4-Week Build Plan', size: 28, font: FONT })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480 },
    children: [new TextRun({ text: 'Prepared for Daniel · D1 Tech Creative', size: 22, font: FONT })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'May 19, 2026', size: 22, font: FONT, color: '64748B' })]
  }),
  new Paragraph({ children: [new PageBreak()] })
];

const body = [
  H1('1. The product, in one paragraph'),
  P('The D1 SEO Dashboard is a multi-tenant web app where the agency (D1 Tech Creative) onboards a client, connects their data sources (Google Search Console, Google Analytics 4, lead form), logs SEO work as it ships, and exposes a clean client-facing view that answers three questions on the first screen: (1) where were we on day 1, (2) where are we now, and (3) how many leads came from SEO vs ads vs direct. Clients log in via magic link, see only their own data, and get a chronological work log so the value of the engagement is visible at all times.'),
  Spacer(),

  H1('2. Goals & non-goals'),
  H2('Goals'),
  Bullet('Two audiences, one app: the agency manages many clients, each client sees only their data.'),
  Bullet('Three data sources in MVP: GSC, GA4, lead form (with full attribution).'),
  Bullet('Automatic ingestion — nightly cron, plus webhook for leads. No manual data entry to keep the dashboard accurate.'),
  Bullet('Changelog the client can read — every page published, every meta rewrite, every schema deployed.'),
  Bullet('Day-1 baseline snapshot per client so before/after is always one screen away.'),
  Bullet('White-label friendly — per-client brand color and name in the header.'),
  Bullet('Cheap to operate (single Vercel + Supabase project covers 50+ clients).'),
  H2('Non-goals for MVP'),
  Bullet('Full keyword position tracking like Ahrefs/SEMrush. We use GSC as the truth source and only show the keywords we explicitly track.'),
  Bullet('Email/SMS alert engine. The schema supports it (alerts table) but the cron rules ship in v2.'),
  Bullet('Built-in invoicing/billing. Use Stripe or QuickBooks externally.'),
  Bullet('Custom branding beyond two color tokens. Full white-label themes come later.'),
  Spacer(),

  H1('3. Tech stack & rationale'),
  twoColTable([
    ['Layer', 'Choice & why'],
    ['Front-end', 'Next.js 14 (App Router) + TypeScript + Tailwind. Server components let us query Supabase directly on the server with RLS enforcing per-user access — no fragile API layer in between.'],
    ['Database', 'Supabase (Postgres + RLS + magic-link auth). Postgres handles the relational shape cleanly, RLS gives multi-tenant isolation at the DB level, and Supabase Auth ships magic links without us running an SMTP server.'],
    ['Hosting', 'Vercel. Built-in cron for nightly GSC/GA4 sync, edge-friendly Next.js deploys, generous free tier.'],
    ['Data sources', 'googleapis SDK (Search Console + Analytics Data API). Service-account auth — each client adds our SA email as a viewer.'],
    ['Lead capture', 'Existing WPCode snippet 5820 already populates 10 hidden attribution fields. Elementor webhook → /api/ingest/lead.'],
    ['Charts', 'Recharts (already installed). Sparklines + small multiples render server-side-friendly with no client bundle bloat.'],
    ['Cost', '$0–25/mo until you outgrow Supabase free (~50k MAU, 500MB DB). At that point upgrade Supabase Pro $25/mo. Vercel free covers traffic for 10+ clients.']
  ]),
  Spacer(),

  H1('4. High-level architecture'),
  P('There are three flows the system supports:'),
  H3('Flow 1 — Ingestion (writes)'),
  Bullet('Nightly Vercel cron hits /api/sync/gsc and /api/sync/ga4. Each route iterates the integrations table, finds rows with kind=gsc or kind=ga4 and status=connected, calls googleapis, and upserts daily rows into gsc_daily_snapshot / gsc_page_daily / gsc_query_daily / ga4_daily_snapshot.'),
  Bullet('Elementor lead form POSTs to /api/ingest/lead. The route normalizes the 10 attribution fields, derives source_bucket (organic | paid | social | direct | ai | referral) via lib/attribution.ts, and inserts a row into leads.'),
  Bullet('Agency posts work to /api/ingest/changelog (or via the admin UI). Each entry has a kind enum, title, description, optional related_url, and a client_visible flag.'),
  H3('Flow 2 — Render (reads)'),
  Bullet('Server components in /admin/* and /dashboard/* run authenticated Supabase queries. RLS policies use the helper functions current_user_is_admin() and current_user_can_see_client(id) so a client_viewer can only ever read their own rows — even if we forget to filter in the app layer.'),
  Bullet('Two SQL views (v_kpi_periods and v_lead_source_breakdown_28d) pre-aggregate the most common dashboard queries so the page loads in one round-trip.'),
  H3('Flow 3 — Auth & onboarding'),
  Bullet('Anyone hitting the app gets redirected to /login. Magic-link sign-in via Supabase Auth.'),
  Bullet('After the user clicks the link, a row in profiles is created. They land on /admin if they have an admin/staff membership, otherwise on /dashboard.'),
  Bullet('To invite a client viewer, agency uses /admin/invites — creates an invitations row with a token + expiry. After the invitee signs in with a magic link, agency runs a one-line SQL to attach their user_id to a memberships row for the right client. (v2 turns this into a self-service accept page.)'),
  Spacer(),

  H1('5. Data model — at a glance'),
  P('Every domain object hangs off a client_id. The agency is one row in organizations, and clients are rows that reference it. Users join either via an org-level membership (admin / staff) or a client-level membership (client_viewer).'),
  threeColTable([
    ['Table', 'Purpose', 'Notable columns'],
    ['organizations', 'The agency itself.', 'name, slug'],
    ['clients', 'One row per client business.', 'name, slug, website, hq_address, phone, brand_primary, brand_dark, notes (jsonb for industry-specific extras like positioning rules), engagement_started'],
    ['profiles', 'Extends auth.users with display info.', 'full_name, email, avatar_url'],
    ['memberships', 'Joins users to org or client.', 'role: admin | staff | client_viewer'],
    ['invitations', 'Pending client invites.', 'token, expires_at, accepted_at'],
    ['integrations', 'Per-client connector config.', 'kind enum (gsc, ga4, gbp, bing_wmt, elementor, zapier, cloudflare), status, config jsonb (site_url, property_id), credentials jsonb'],
    ['gsc_daily_snapshot', 'Daily aggregate per client. Powers KPI cards.', 'impressions, clicks, ctr, avg_position, indexed_pages'],
    ['gsc_page_daily', 'Per-page daily roll-up.', 'page_url + (client_id, date) primary key'],
    ['gsc_query_daily', 'Per-query daily roll-up.', 'query + (client_id, date) primary key'],
    ['tracked_keywords', 'Explicit "we care about these" list.', 'query, intent enum, cadence (daily/weekly)'],
    ['ga4_daily_snapshot', 'Sessions, users, organic_sessions, conversions.', 'engagement_rate weighted by sessions'],
    ['leads', 'The killer feature — full attribution.', '10 attribution fields + source_bucket + contact jsonb + payload jsonb + status'],
    ['changelog', 'Agency work log → client-visible feed.', 'kind enum (page_published, schema_deployed, …), title, description, client_visible bool, performed_by'],
    ['citations', 'Local SEO directory tracker.', 'directory_name, claimed, info_match, last_verified'],
    ['baseline_snapshot', 'Day-1 picture per client.', 'metrics jsonb (pages_indexed, impressions_90d, avg_ranking_position, …)'],
    ['alerts', 'Anomaly engine output.', 'kind, severity, triggered_at']
  ]),
  Spacer(),

  H1('6. Row-Level Security'),
  P('Every per-client table has two policies installed via a DO block in the migration:'),
  Bullet('Read: row is visible only if current_user_can_see_client(row.client_id) returns true. That function checks the memberships table — admin/staff can see anything in their org, client_viewer can only see their assigned client.'),
  Bullet('Write: only current_user_is_admin() can insert/update/delete. Client viewers are read-only.'),
  P('This means: even if a bug lets a client viewer hit /admin/clients/<other-client-id>, the database returns no rows. Defense in depth.'),
  P('The webhook endpoints (lead, changelog) bypass RLS by using the service-role key — but they validate a shared secret in the header before doing anything.'),
  Spacer(),

  H1('7. Attribution — the killer feature, in detail'),
  P('The single most-asked question from clients like Phil is "are FB ads working vs organic?". We make that the first thing they see.'),
  H3('How the data flows in'),
  Bullet('Visitor lands on a page. WPCode snippet 5820 (already installed on A Plus) captures utm_*, fbclid, gclid, msclkid, document.referrer, and landing path. Stores in localStorage for 5 minutes.'),
  Bullet('A MutationObserver watches for the Elementor form, populates 10 hidden fields.'),
  Bullet('User submits. Elementor fires three Actions After Submit: Collect Submissions (DB), Webhook → /api/ingest/lead, and the Thank You popup.'),
  Bullet('Our webhook receives the payload, normalizes the field names (Elementor sometimes Title Cases them, e.g. "Referrer" with capital R — already a known bug we fixed for A Plus), derives source_bucket via attribution.ts, and inserts the row.'),
  H3('Caveats baked into the design'),
  Bullet('First-touch within 5 min only — deliberate per-session attribution. Visitors returning hours later get re-attributed to whatever brought them back.'),
  Bullet('Direct attribution for organic Google is ~70% accurate because of referrer stripping (AMP, "open in new tab", strict referrer policy, mobile browsers). The dashboard reconciles by cross-referencing GSC organic clicks — so the "Source mix" on the leads page is the attribution-tagged count, not the actual organic count. We show both.'),
  Bullet('AI search visibility (ChatGPT, Claude, Perplexity, Gemini) is captured as source_bucket=ai when the referrer matches. This is increasingly important; v2 will add a dedicated AI traffic chart.'),
  Spacer(),

  H1('8. MVP feature set (Phase 1)'),
  H2('Agency view'),
  Bullet('Clients list with 28-day impressions / clicks / avg position per client.'),
  Bullet('Client detail page — baseline metrics, current 28-day KPIs, latest 20 changelog entries, latest 20 leads, top queries, top pages.'),
  Bullet('Post a changelog entry — UI form + /api/ingest/changelog programmatic endpoint.'),
  Bullet('Invite a client viewer — generates an invitation row with token.'),
  H2('Client view'),
  Bullet('Overview page: 4 KPI cards (7d/28d impressions, 28d clicks, avg position), before/after baseline panel, recent changelog feed, latest leads with source mix.'),
  Bullet('Keywords page — full tracked-keyword table with intent, current position, impressions, clicks.'),
  Bullet('Pages page — top 100 pages by impressions.'),
  Bullet('Leads page — full leads table with 28-day source mix breakdown.'),
  Bullet('Changelog page — full chronological feed of agency work (client_visible only).'),
  Spacer(),

  H1('9. Phase 2 features (after MVP ships)'),
  Bullet('Time-series charts using Recharts — sparklines inside KPI cards, full impressions/clicks chart on overview, position trend per tracked keyword.'),
  Bullet('Alerts engine — nightly job diffs yesterday vs today on gsc_query_daily, emits rows when avg_position changes by >5 positions or impressions spike >50%.'),
  Bullet('Google Business Profile integration — reviews count, calls, direction requests. Critical for Mary Angels.'),
  Bullet('Bing Webmaster Tools integration once Phil shares his MS account.'),
  Bullet('Citation tracker UI on the dashboard (data model already exists).'),
  Bullet('Auto-generated monthly narrative via Claude API. Feed the last 30 days of changelog + GSC delta into Claude, get back a 2-paragraph plain-English summary on the overview page.'),
  Bullet('Self-service invite acceptance flow (no manual SQL for the agency to attach memberships).'),
  Bullet('Per-client custom domain or subdomain (mary-angels.dashboards.d1techcreative.com).'),
  Spacer(),

  H1('10. Phase 3 features (intelligence layer)'),
  Bullet('Predicted next-month traffic — fit a simple regression on the last 90 days of GSC data + indexing velocity, project forward.'),
  Bullet('Opportunity scanner — "you rank #11 for X — push to page 1 with these 3 tactics" using Claude to suggest from the work catalog.'),
  Bullet('Competitor watch — track 3 competitor domains per client, monitor their position changes weekly.'),
  Bullet('AI-search citation tracker — does ChatGPT search / Perplexity / Claude with web access mention the client when answering relevant queries?'),
  Bullet('ROI report — multiply leads × close rate × avg booking value → estimated revenue from SEO. Compare to engagement cost.'),
  Spacer(),

  H1('11. Four-week build plan'),
  fourColTable([
    ['Week', 'Theme', 'Ship', 'Done means'],
    ['Week 1', 'Foundation', 'Supabase project + auth + clients/memberships/RLS. Agency admin can log in, see seeded clients, browse a basic client detail page. Magic-link login works end-to-end.', 'You can sign in as agency and see the seeded A Plus dashboard with mock data.'],
    ['Week 2', 'Ingestion', '/api/ingest/lead + /api/ingest/changelog + nightly cron for GSC + GA4. One real client (A Plus) connected to real GSC.', 'A real lead from aplusmovingandstorage.co appears in the dashboard within 60 seconds of form submit. GSC numbers for yesterday auto-load each morning.'],
    ['Week 3', 'Client view', 'Full /dashboard/* — overview, keywords, pages, leads, changelog. Brand colors applied. Invite flow generates magic links. First client (Phil) invited.', 'Phil signs in, sees his own dashboard, asks "where is X?" — that question becomes the v2 backlog.'],
    ['Week 4', 'Polish + onboard', 'Charts (Recharts sparklines), date-range comparison, second client onboarded (Mary Angels). Documentation in docs/ for "how to onboard a new client in 30 minutes".', 'Two clients live. You can onboard a third in under an hour.']
  ]),
  Spacer(),

  H1('12. Onboarding a new client — the 30-minute runbook'),
  Bullet('Insert the client + baseline_snapshot rows. Use the SQL template in README §7.'),
  Bullet('Get GSC + GA4 access — share the service-account email; client adds it as "Restricted" / "Viewer".'),
  Bullet('Insert integrations rows for gsc and ga4 with the right site_url / property_id in config.'),
  Bullet('Install WPCode snippet 5820 (lead attribution) if it isn\'t there yet. Add the Elementor webhook action with the dashboard URL + secret.'),
  Bullet('Seed tracked_keywords from the keyword research doc — primary daily, service/location weekly.'),
  Bullet('Generate an invitation for the client owner via /admin/invites. Share the magic-link URL.'),
  Bullet('Trigger a manual sync (curl /api/sync/gsc?token=…) to backfill last 7 days.'),
  Spacer(),

  H1('13. Operational concerns'),
  H3('Cost projection'),
  twoColTable([
    ['Service', 'Cost at scale'],
    ['Vercel Hobby', '$0 — covers up to ~10 clients. Pro is $20/mo if you cross.'],
    ['Supabase Free', '$0 — 500 MB DB, 2 GB bandwidth/mo. Will hit ceiling around 20 clients.'],
    ['Supabase Pro', '$25/mo — 8 GB DB. Covers 100+ clients easily.'],
    ['Google API quota', 'Free. GSC = 1200 queries/min/property. GA4 = 200k tokens/day. Both generous.'],
    ['Domain', '$10–15/year if you set a custom one.'],
    ['Total (10 clients)', '$0–25/mo.'],
    ['Total (100 clients)', '$45–80/mo (Supabase Pro + Vercel Pro).']
  ]),
  H3('Data retention'),
  Bullet('Daily snapshots compound at ~10 rows × 365 days = 3,650 rows/year/client. For 100 clients that\'s 365k rows — trivially small for Postgres.'),
  Bullet('Leads grow proportionally to client volume — also small.'),
  Bullet('No retention policy in MVP. Add monthly aggregation rollup in year 2 if needed.'),
  H3('Security checklist'),
  Bullet('Service-role key only used server-side. Never exposed to the browser.'),
  Bullet('All client tables protected by RLS — even a leaked anon key can\'t cross-client read.'),
  Bullet('Webhook endpoints require a shared secret in the header.'),
  Bullet('Sync endpoints require an internal API token.'),
  Bullet('Magic-link auth means no password leaks possible. Sessions live in HTTP-only cookies.'),
  H3('Observability'),
  Bullet('Vercel logs cover the API routes.'),
  Bullet('Supabase dashboard shows query performance.'),
  Bullet('integrations.last_sync_at + last_error give a per-client integration health view (add a UI surface in v2).'),
  Spacer(),

  H1('14. What\'s in the repo right now'),
  P('This handoff comes with a runnable scaffold (in the d1-seo-dashboard/ folder). Everything described above is wired up except the v2 features. The notable files:'),
  twoColTable([
    ['File / folder', 'What it does'],
    ['supabase/migrations/0001_init.sql', 'The full schema, enums, RLS policies, and aggregate views.'],
    ['supabase/seed.sql', 'A Plus + Mary Angels seeded with real metrics from the handoff docs, tracked keywords, baselines, sample changelog entries, sample leads.'],
    ['src/lib/supabase/{server,client}.ts', 'SSR + browser Supabase clients. server.ts also exposes a service-role admin client for webhooks.'],
    ['src/lib/gsc.ts, ga4.ts', 'googleapis wrappers with one-call sync functions. Service-account auth.'],
    ['src/lib/attribution.ts', 'Pure function deriving source_bucket from raw UTM/click-id/referrer fields.'],
    ['src/middleware.ts + src/lib/auth.ts', 'Auth gate + role resolution.'],
    ['src/app/(agency)/admin/*', 'Agency views — clients list, client detail, post changelog, invites.'],
    ['src/app/(client)/dashboard/*', 'Client views — overview, keywords, pages, leads, changelog.'],
    ['src/app/api/ingest/{lead,changelog}/route.ts', 'Webhook receivers.'],
    ['src/app/api/sync/{gsc,ga4}/route.ts', 'Nightly cron endpoints.'],
    ['README.md', 'Local setup + deploy + new-client onboarding runbook.'],
    ['vercel.json', 'Cron schedule.']
  ]),
  Spacer(),

  H1('15. Decision log (so you\'re not surprised later)'),
  Bullet('Magic-link auth, not passwords — fewer support tickets, no breach surface, native in Supabase.'),
  Bullet('Server components everywhere — keeps Supabase calls behind the server, RLS does the heavy lifting, no separate REST layer to maintain.'),
  Bullet('Postgres views for aggregates (v_kpi_periods, v_lead_source_breakdown_28d) — keeps the front-end queries one-line, lets us optimize aggregation in SQL instead of TS.'),
  Bullet('JSONB for "stuff that varies per client" (clients.notes, integrations.config, leads.payload). Lets us add new fields without migrations. Trade-off: less typing.'),
  Bullet('Service-account auth for Google APIs — one credential to manage, clients add us as a viewer. Per-client OAuth is doable but operationally heavier.'),
  Bullet('Changelog is the central artifact — not GSC metrics. Clients with 0 ranking changes still see value because you\'re shipping work. This is what differentiates us from Ahrefs.'),
  Bullet('No multi-org support in MVP — D1 is the only org. Schema supports it; adding more orgs later is a 1-line code change.'),
  Spacer(),

  H1('16. Risks & mitigations'),
  threeColTable([
    ['Risk', 'Likelihood', 'Mitigation'],
    ['Client claims a number is wrong', 'High', 'Show data source attribution next to every number ("GSC, updated 4h ago"). Provide raw drill-down so disagreements end at the data, not the UI.'],
    ['GSC API quota hit', 'Low', 'Quota is 1200 q/min/property. With nightly cron we use ~3/property/night.'],
    ['Lead webhook drops a submission', 'Medium', 'Elementor also stores in its Submissions DB. v2 reconciliation cron compares both nightly and flags missing rows.'],
    ['Supabase RLS bug exposes cross-client data', 'Low if tested', 'Add an automated integration test in CI: log in as client_viewer A, attempt to fetch client B\'s data, expect empty.'],
    ['Client churns and asks for their data', 'Medium', 'Export endpoint in v2 — CSV of changelog + leads + KPI history.'],
    ['Agency hits Supabase free tier ceiling at 25 clients', 'Eventually', 'Already budgeted — $25/mo Supabase Pro covers next 100x growth.']
  ]),
  Spacer(),

  H1('17. What to do next'),
  Bullet('Spin up a Supabase project. Paste 0001_init.sql then seed.sql into the SQL editor.'),
  Bullet('Clone the scaffold, set .env.local, npm install, npm run dev.'),
  Bullet('Sign in as yourself with magic link. Insert a memberships row tying your user_id to org D1 with role=admin.'),
  Bullet('You should see both seeded clients with their mock data. Click into A Plus to see the full dashboard.'),
  Bullet('Connect a real GSC: add the service-account email to your A Plus GSC, insert an integrations row, run a manual sync.'),
  Bullet('Wire the Elementor webhook on aplusmovingandstorage.co to /api/ingest/lead. Submit a test form — you should see it appear in the dashboard within seconds.'),
  Bullet('Deploy to Vercel. Confirm crons are scheduled.'),
  Bullet('Invite Phil. Then onboard Mary Angels using the runbook in §12.'),
  Spacer(),

  H1('18. Beyond this doc'),
  P('Everything in this plan is intentionally MVP-shaped — meaning we ship the smallest thing that proves the model, then we let real client feedback dictate the next features. The killer differentiator vs Ahrefs/AgencyAnalytics/SE Ranking is not the metrics (anyone can show GSC numbers) — it\'s the changelog. Every page you publish, every meta you rewrite, every schema you deploy lands on the client\'s screen the same day. They see the work, not just the results.'),
  P('Build this. Onboard 5 clients. See what they actually click on. Then we layer in alerts, AI summaries, and the intelligence features in §10.')
];

const doc = new Document({
  creator: 'D1 Tech Creative',
  title: 'D1 SEO Dashboard — Build Plan',
  description: 'Architecture, data model, MVP scope, and 4-week build plan.',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: FONT, color: '0A2540' },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: '025AFA' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: '0A2540' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'D1 SEO Dashboard — Build Plan', font: FONT, size: 18, color: '64748B' })] })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', font: FONT, size: 18, color: '64748B' }), new TextRun({ font: FONT, size: 18, color: '64748B', children: [PageNumber.CURRENT] })] })] })
    },
    children: [...titlePage, ...body]
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, '..', '..', 'D1-SEO-Dashboard-Build-Plan.docx');
  fs.writeFileSync(out, buf);
  console.log('Wrote', out, buf.length, 'bytes');
}).catch(err => { console.error(err); process.exit(1); });
