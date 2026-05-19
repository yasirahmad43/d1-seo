-- ============================================================================
-- D1 Tech Creative — seed file
-- Loads: agency org, two pilot clients (A Plus, Mary Angels), tracked
-- keywords from the handoff docs, baseline snapshots, real GSC daily
-- numbers, sample changelog entries, sample leads.
-- ============================================================================

-- Idempotent insert helper: org
insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-00000000d1d1', 'D1 Tech Creative', 'd1-tech-creative')
on conflict (slug) do nothing;

-- ===== Clients =====
insert into clients (id, org_id, name, slug, website, industry, hq_address, phone, email, brand_primary, brand_dark, notes, engagement_started)
values
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-00000000d1d1',
   'A Plus Moving & Storage', 'a-plus-moving',
   'https://aplusmovingandstorage.co',
   'Long-distance / interstate moving',
   '600 NE 185th St, Miami, FL 33179',
   '844-396-6839', 'support@aplusmovingandstorage.co',
   '#025AFA', '#0A2540',
   jsonb_build_object(
     'service_area','48 contiguous US states',
     'excluded_states', jsonb_build_array('HI','AK'),
     'usdot','3006268',
     'mc_number','00026730',
     'bbb_rating','A+',
     'positioning_rules', jsonb_build_array(
       'ALWAYS say "48 contiguous states" — never "50 states"',
       'NEVER mention Hawaii or Alaska',
       'Position as national long-distance, NOT "Miami-based local"'
     ),
     'client_contact','Phil'
   ),
   '2026-04-01'),
  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-00000000d1d1',
   'Mary Angels Home Care', 'mary-angels',
   'https://maryangelshomecare.com',
   'Non-medical home care for seniors',
   'Pittsburgh, PA',
   '412-900-9354', 'info@maryangelshomecare.com',
   '#0B7CC4', '#0F2A44',
   jsonb_build_object(
     'service_area','Pittsburgh, PA + 30+ surrounding neighborhoods',
     'owner','Maria Casanova',
     'tech_stack','WordPress + Elementor (Hello Elementor), AIOSEO, WPCode, SiteGround, Cloudflare'
   ),
   '2026-05-07')
on conflict (org_id, slug) do nothing;

-- ===== Baselines =====
insert into baseline_snapshot (client_id, captured_on, metrics, notes) values
  ('22222222-2222-2222-2222-222222222222', '2026-05-07',
   jsonb_build_object(
     'pages_indexed','6 of 78',
     'avg_ranking_position', 42,
     'clicks_90d', 3,
     'impressions_90d', 82,
     'avg_ctr', 0.037,
     'gbp_claimed', false,
     'localbusiness_schema', false
   ),
   'Day 1 audit — pre-engagement state'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-01',
   jsonb_build_object(
     'pages_indexed', 40,
     'impressions_baseline_30d', null,
     'gsc_configured', true
   ),
   'A Plus engagement baseline (initial GSC connect)')
on conflict (client_id) do update set metrics = excluded.metrics, captured_on = excluded.captured_on;

-- ===== Tracked keywords =====
insert into tracked_keywords (client_id, query, intent, cadence) values
  -- Mary Angels — primary (track daily)
  ('22222222-2222-2222-2222-222222222222', 'home care pittsburgh', 'primary', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'home care services pittsburgh pa', 'primary', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'home care agency pittsburgh', 'primary', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'in-home care pittsburgh', 'primary', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'in-home senior care pittsburgh', 'primary', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'non-medical home care pittsburgh', 'primary', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'senior home care pittsburgh', 'primary', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'elder care pittsburgh', 'primary', 'daily'),
  -- service-specific (weekly)
  ('22222222-2222-2222-2222-222222222222', 'personal care services pittsburgh', 'service', 'weekly'),
  ('22222222-2222-2222-2222-222222222222', 'respite care pittsburgh', 'service', 'weekly'),
  ('22222222-2222-2222-2222-222222222222', 'alzheimer''s care at home pittsburgh', 'service', 'weekly'),
  ('22222222-2222-2222-2222-222222222222', 'companion care pittsburgh', 'service', 'weekly'),
  ('22222222-2222-2222-2222-222222222222', '24/7 home care pittsburgh', 'service', 'weekly'),
  -- commercial-intent (daily — highest converters)
  ('22222222-2222-2222-2222-222222222222', 'home care cost pittsburgh', 'commercial', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'home care vs assisted living pittsburgh', 'commercial', 'daily'),
  ('22222222-2222-2222-2222-222222222222', 'how to pay for home care', 'commercial', 'daily'),
  -- A Plus
  ('11111111-1111-1111-1111-111111111111', 'a plus moving and storage', 'branded', 'daily'),
  ('11111111-1111-1111-1111-111111111111', 'aplus moving and storage', 'branded', 'daily'),
  ('11111111-1111-1111-1111-111111111111', 'long distance movers minneapolis', 'location', 'weekly'),
  ('11111111-1111-1111-1111-111111111111', 'long distance movers charlotte', 'location', 'weekly'),
  ('11111111-1111-1111-1111-111111111111', 'long distance movers toledo', 'location', 'weekly'),
  ('11111111-1111-1111-1111-111111111111', 'long distance moving company', 'primary', 'daily'),
  ('11111111-1111-1111-1111-111111111111', 'interstate moving company', 'primary', 'daily')
on conflict (client_id, query) do nothing;

-- ===== GSC daily snapshots (A Plus — last 14 days, real data from handoff) =====
insert into gsc_daily_snapshot (client_id, date, impressions, clicks, ctr, avg_position, indexed_pages) values
  ('11111111-1111-1111-1111-111111111111', '2026-05-04', 138, 1, 0.0072, 31.0, 105),
  ('11111111-1111-1111-1111-111111111111', '2026-05-05', 116, 3, 0.0259, 30.4, 107),
  ('11111111-1111-1111-1111-111111111111', '2026-05-06', 129, 3, 0.0233, 29.8, 109),
  ('11111111-1111-1111-1111-111111111111', '2026-05-07', 260, 6, 0.0231, 28.5, 110),
  ('11111111-1111-1111-1111-111111111111', '2026-05-08', 253, 4, 0.0158, 28.1, 112),
  ('11111111-1111-1111-1111-111111111111', '2026-05-09', 105, 1, 0.0095, 28.4, 114),
  ('11111111-1111-1111-1111-111111111111', '2026-05-10', 175, 1, 0.0057, 27.9, 115),
  ('11111111-1111-1111-1111-111111111111', '2026-05-11', 247, 0, 0.0000, 27.5, 116),
  ('11111111-1111-1111-1111-111111111111', '2026-05-12', 417, 7, 0.0168, 27.2, 117),
  ('11111111-1111-1111-1111-111111111111', '2026-05-13', 290, 5, 0.0172, 26.8, 117),
  ('11111111-1111-1111-1111-111111111111', '2026-05-14', 305, 4, 0.0131, 26.5, 117),
  ('11111111-1111-1111-1111-111111111111', '2026-05-15', 360, 6, 0.0167, 26.1, 117),
  ('11111111-1111-1111-1111-111111111111', '2026-05-16', 240, 3, 0.0125, 25.9, 117),
  ('11111111-1111-1111-1111-111111111111', '2026-05-17', 280, 4, 0.0143, 25.5, 117),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 410, 8, 0.0195, 25.2, 117)
on conflict (client_id, date) do nothing;

-- Mary Angels — early days (less data, just engaged May 7)
insert into gsc_daily_snapshot (client_id, date, impressions, clicks, ctr, avg_position, indexed_pages) values
  ('22222222-2222-2222-2222-222222222222', '2026-05-07', 4, 0, 0.0000, 42.0, 6),
  ('22222222-2222-2222-2222-222222222222', '2026-05-08', 7, 0, 0.0000, 41.5, 14),
  ('22222222-2222-2222-2222-222222222222', '2026-05-09', 12, 0, 0.0000, 40.0, 22),
  ('22222222-2222-2222-2222-222222222222', '2026-05-10', 18, 1, 0.0556, 38.2, 31),
  ('22222222-2222-2222-2222-222222222222', '2026-05-11', 25, 0, 0.0000, 36.4, 43),
  ('22222222-2222-2222-2222-222222222222', '2026-05-12', 34, 1, 0.0294, 34.1, 52),
  ('22222222-2222-2222-2222-222222222222', '2026-05-13', 51, 2, 0.0392, 31.8, 60),
  ('22222222-2222-2222-2222-222222222222', '2026-05-14', 67, 2, 0.0299, 29.5, 67),
  ('22222222-2222-2222-2222-222222222222', '2026-05-15', 82, 3, 0.0366, 27.8, 71),
  ('22222222-2222-2222-2222-222222222222', '2026-05-16', 95, 3, 0.0316, 26.4, 74),
  ('22222222-2222-2222-2222-222222222222', '2026-05-17', 110, 4, 0.0364, 25.1, 76),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 138, 5, 0.0362, 23.9, 78)
on conflict (client_id, date) do nothing;

-- ===== GSC page perf — A Plus top pages =====
insert into gsc_page_daily (client_id, date, page_url, impressions, clicks, avg_position) values
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/', 410, 8, 18.2),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/contact/', 45, 0, 38.1),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/movers/california/los-angeles/', 33, 0, 41.2),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/movers/north-carolina/charlotte/', 28, 1, 32.5),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/about/', 24, 0, 39.0),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/movers/ohio/toledo/', 22, 0, 36.7),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/movers/new-york/', 20, 0, 35.8),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/movers/minnesota/minneapolis/', 18, 0, 30.4),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '/movers/washington-state/tacoma/', 7, 2, 12.6)
on conflict (client_id, date, page_url) do nothing;

-- ===== GSC query perf — top branded for A Plus =====
insert into gsc_query_daily (client_id, date, query, impressions, clicks, avg_position) values
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 'a plus moving and storage', 66, 7, 1.2),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 'aplus moving and storage', 17, 7, 1.8),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 'a+ moving and storage', 13, 2, 2.1),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 'a plus moving', 39, 1, 5.6),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 'long distance movers minneapolis', 26, 0, 28.4),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 'hollywood fl moving and storage', 29, 0, 12.3),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'home care pittsburgh', 38, 1, 26.4),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'in-home care pittsburgh', 22, 1, 24.1),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'home care cost pittsburgh', 14, 0, 31.5),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'respite care pittsburgh', 11, 0, 29.0)
on conflict (client_id, date, query) do nothing;

-- ===== Sample leads (A Plus) =====
insert into leads (client_id, submitted_at, utm_source, utm_medium, utm_campaign, fbclid, gclid, landing_page, referrer, source_bucket, contact, payload, status) values
  ('11111111-1111-1111-1111-111111111111', '2026-05-15 14:22:00+00', 'google','organic',null,null,null,'/movers/ohio/toledo/','https://www.google.com/', 'organic',
    '{"name":"Jared M.","phone":"+1-419-555-0111","email":"jared@example.com"}',
    '{"pickup":"Toledo, OH","destination":"Phoenix, AZ","move_size":"3BR","move_date":"2026-06-12"}','qualified'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-16 09:10:00+00', 'facebook','cpc','spring_movers','IwAR12345',null,'/','https://l.facebook.com/', 'paid',
    '{"name":"Lina T.","phone":"+1-704-555-0144"}',
    '{"pickup":"Charlotte, NC","destination":"Austin, TX","move_size":"2BR"}','new'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-17 18:02:00+00', null,null,null,null,'gclid_abc','/','','paid',
    '{"name":"Devon K.","email":"devon@example.com"}',
    '{"pickup":"Minneapolis, MN","destination":"Tampa, FL","move_size":"1BR"}','booked'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18 11:45:00+00', 'chatgpt.com','ai',null,null,null,'/long-distance-moving-guide/','https://chatgpt.com/', 'ai',
    '{"name":"Pat R."}',
    '{"pickup":"Tacoma, WA","destination":"Denver, CO"}','new'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18 16:30:00+00', null,null,null,null,null,'/','', 'direct',
    '{"name":"Sara V.","phone":"+1-305-555-0123"}',
    '{"pickup":"Miami, FL","destination":"Boston, MA","move_size":"4BR"}','new'),
  -- Mary Angels
  ('22222222-2222-2222-2222-222222222222', '2026-05-17 10:00:00+00', 'google','organic',null,null,null,'/personal-care/','https://www.google.com/', 'organic',
    '{"name":"Linda B.","phone":"+1-412-555-0199"}',
    '{"care_type":"Personal care","hours_per_week":20}','qualified'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18 09:15:00+00', 'google','organic',null,null,null,'/service-areas/squirrel-hill/','https://www.google.com/', 'organic',
    '{"name":"Michael D.","email":"mike@example.com"}',
    '{"care_type":"Respite","hours_per_week":10}','new');

-- ===== Changelog — A Plus (excerpt from handoff doc) =====
insert into changelog (client_id, occurred_at, kind, title, description) values
  ('11111111-1111-1111-1111-111111111111', '2026-04-08', 'page_published', 'Published 6 resource guide pages',
    'Cluster foundation: moving cost guide, packing guide, long-distance checklist, interstate regulations primer, storage options, claims process.'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-12', 'page_published', 'Published 30 route pages (city-to-city corridors)',
    'Programmatic pages for highest-search-volume route combinations.'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-15', 'page_published', 'Published 40 city pages',
    'Long-distance arrival/departure city pages with localized content.'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-22', 'schema_deployed', 'Deployed MovingCompany + LocalBusiness JSON-LD sitewide',
    'WPCode Snippet 5805. Validated via Rich Results Test.'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-24', 'schema_deployed', 'Added FAQPage + HowTo schema to resource guides',
    'WPCode Snippet 5806 — 6 guide pages now eligible for FAQ rich results.'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-25', 'snippet_added', 'Updated robots.txt to allow AI crawlers',
    'GPTBot, ClaudeBot, PerplexityBot explicitly allowed. NGINX edge block still pending SiteGround support.'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-02', 'redirect_added', 'Fixed 7 "Not found 404" pages in GSC',
    '301 redirects deployed via WPCode Snippet 5818.'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-08', 'indexing_request', 'Requested indexing on top 20 priority pages',
    'GSC URL Inspection submissions for highest-value money pages.'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-12', 'snippet_added', 'Deployed lead attribution tracking',
    'WPCode 5820 — captures UTMs, fbclid, gclid, msclkid, referrer; injects 10 hidden fields into Elementor form. Powers the leads dashboard.'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-15', 'page_published', 'Wave A: 20 spillover city pages live',
    'Adds long-tail coverage for second-tier metros.'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-17', 'page_published', 'Wave B: 25 new-metro city pages live',
    'Brings city page total above 100 across all 48 contiguous states.'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', 'milestone', '117 pages indexed (+192% since baseline)',
    'Baseline was 40 indexed three months ago. Indexing velocity is on target.');

-- ===== Changelog — Mary Angels (excerpt) =====
insert into changelog (client_id, occurred_at, kind, title, description) values
  ('22222222-2222-2222-2222-222222222222', '2026-05-07', 'audit', 'Day 1 SEO audit + prioritized fix list',
    '78-page site reviewed. 6/78 indexed, avg position ~42, mobile sticky CTAs broken, multiple wrong phone numbers, no GBP, no LocalBusiness schema.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-07', 'snippet_added', 'GSC + GA4 set up, AIOSEO configured',
    'Cross-account permissions linked. Sitemap submitted.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-09', 'redirect_added', '301 redirects for old date-based blog URLs',
    'Removed /YYYY/MM/DD/ pattern from URLs and added redirects.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-10', 'page_published', '6 service area + neighborhood pages built',
    'Initial cluster batch. Squirrel Hill, Shadyside, Oakland, Mt. Lebanon, North Hills, Bethel Park.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-11', 'page_published', '10 more neighborhood pages built (21 total)',
    'Expanded coverage to Fox Chapel, Sewickley, Cranberry, Monroeville, Upper St. Clair, etc.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-12', 'page_published', '20 service × neighborhood combo pages + 12 condition pages',
    'Companion, personal, respite, dementia × 5 neighborhoods each. Conditions: Parkinson''s, stroke, heart failure, diabetes, COPD, arthritis, cancer, fall recovery, hip/knee, MS, ALS, vision loss, veteran.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-13', 'meta_updated', 'Phone numbers unified site-wide',
    '412-318-4237 → 412-900-9354 across 45 pages + 3 templates + AIOSEO schema. tel: links converted to E.164.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'indexing_request', '10 priority URLs force-indexed via GSC',
    'in-home-care, services, service-areas, personal-care, alzheimers-dementia-care, respite-care, house-cleaning, about, cost guide, comparison guide.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'meta_updated', '75 pages: AIOSEO titles + meta descriptions rewritten',
    'Homepage + 4 main service + 21 neighborhood + 14 conditions + 6 resources + 20 combos + 8 other.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'image_optimized', 'All 161 images now have descriptive, keyword-aware alt text',
    'Coverage went from 73 missing → 0 missing.'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', 'milestone', '78 pages indexed (was 6 on day 1)',
    'Cluster build complete. Engagement-to-indexed delta: +72 pages in 11 days.');

-- ===== Citations (A Plus — placeholder rows) =====
insert into citations (client_id, directory_name, directory_url, claimed, info_match) values
  ('11111111-1111-1111-1111-111111111111', 'Yelp', 'https://yelp.com', false, false),
  ('11111111-1111-1111-1111-111111111111', 'BBB',  'https://bbb.org',  true,  true),
  ('11111111-1111-1111-1111-111111111111', 'Bing Places', 'https://bingplaces.com', false, false),
  ('11111111-1111-1111-1111-111111111111', 'Apple Business Connect', 'https://businessconnect.apple.com', false, false),
  ('11111111-1111-1111-1111-111111111111', 'Yellow Pages', 'https://yellowpages.com', false, false),
  ('11111111-1111-1111-1111-111111111111', 'Manta', 'https://manta.com', false, false),
  ('11111111-1111-1111-1111-111111111111', 'Foursquare', 'https://foursquare.com', false, false),
  ('11111111-1111-1111-1111-111111111111', 'Moving.com', 'https://moving.com', false, false),
  ('11111111-1111-1111-1111-111111111111', 'MyMovingReviews', 'https://mymovingreviews.com', false, false),
  ('22222222-2222-2222-2222-222222222222', 'Google Business Profile', 'https://business.google.com', false, false),
  ('22222222-2222-2222-2222-222222222222', 'Caring.com',  'https://caring.com', false, false),
  ('22222222-2222-2222-2222-222222222222', 'Yelp',        'https://yelp.com', false, false),
  ('22222222-2222-2222-2222-222222222222', 'BBB',         'https://bbb.org', false, false),
  ('22222222-2222-2222-2222-222222222222', 'Healthgrades','https://healthgrades.com', false, false);

-- ===== Sample alerts =====
insert into alerts (client_id, kind, severity, title, detail) values
  ('11111111-1111-1111-1111-111111111111', 'rank_gain', 'info', '+6 positions: "long distance movers minneapolis"',
    jsonb_build_object('from', 34, 'to', 28, 'query','long distance movers minneapolis')),
  ('22222222-2222-2222-2222-222222222222', 'indexing_gain', 'info', '+12 pages newly indexed in last 24h',
    jsonb_build_object('count', 12));
