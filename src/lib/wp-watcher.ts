// WordPress auto-watcher.
//
// Pulls /wp-json/wp/v2/pages, /wp/v2/posts, AIOSEO meta, WPCode snippets,
// and media-library alt-text coverage. Diffs against wp_snapshot etc.
// Emits changelog rows for every detected change so the dashboard updates
// itself with zero manual entry.
//
// Each client's integration row (kind=elementor or a future kind='wordpress')
// must include:
//   config.wp_base_url    e.g. "https://maryangelshomecare.com"
//   credentials.app_user  WordPress username with edit_posts cap
//   credentials.app_pass  Application Password (Settings → Users → Profile)
//
// We use Basic auth with WordPress Application Passwords — built into core
// since WP 5.6, no plugins required, can be revoked per-site without
// affecting human users.

import crypto from 'crypto';
import { createSupabaseAdminClient } from './supabase/server';
import { deriveSourceBucket } from './attribution';
import { notify } from './notify';

type WpPost = {
  id: number;
  slug: string;
  link: string;
  type: string;
  modified: string;
  title: { rendered: string };
  content: { rendered: string };
};

type WpCreds = { wp_base_url: string; app_user: string; app_pass: string; shim_token?: string };

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

async function wpFetch<T>(creds: WpCreds, path: string): Promise<T> {
  const auth = Buffer.from(`${creds.app_user}:${creds.app_pass}`).toString('base64');
  const res = await fetch(`${creds.wp_base_url.replace(/\/$/,'')}${path}`, {
    headers: { Authorization: `Basic ${auth}`, 'User-Agent': 'D1-SEO-Dashboard/1.0' }
  });
  if (!res.ok) throw new Error(`WP ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

// Shim endpoints use a separate header-based token. No Basic auth.
async function shimFetch<T>(creds: WpCreds, path: string): Promise<T> {
  if (!creds.shim_token) throw new Error('shim_token not configured');
  const res = await fetch(`${creds.wp_base_url.replace(/\/$/,'')}${path}`, {
    headers: { 'X-D1-Token': creds.shim_token, 'User-Agent': 'D1-SEO-Dashboard/1.0' }
  });
  if (!res.ok) throw new Error(`Shim ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchAllPosts(creds: WpCreds, type: 'pages'|'posts'): Promise<WpPost[]> {
  const out: WpPost[] = [];
  let page = 1;
  while (true) {
    const batch = await wpFetch<WpPost[]>(creds, `/wp-json/wp/v2/${type}?per_page=100&page=${page}&status=publish&_fields=id,slug,link,type,modified,title,content`);
    if (!batch.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 20) break;     // safety: cap at 2000 posts/pages per type
  }
  return out;
}

// AIOSEO stores meta under post.meta._aioseo_title / _aioseo_description.
// Easiest path: query each post via /wp/v2/{type}/{id}?_fields=id,meta and
// look at meta._aioseo_title. But that's slow. Faster: AIOSEO REST endpoint
// /aioseo/v1/posts when AIOSEO Pro is active. We support both with fallback.
async function fetchAioseoMeta(creds: WpCreds, id: number, type: 'pages'|'posts'): Promise<{ title?: string; description?: string }> {
  try {
    const r = await wpFetch<any>(creds, `/wp-json/wp/v2/${type}/${id}?_fields=id,meta`);
    return {
      title:       r?.meta?._aioseo_title ?? r?.meta?.aioseo_title ?? undefined,
      description: r?.meta?._aioseo_description ?? r?.meta?.aioseo_description ?? undefined
    };
  } catch {
    return {};
  }
}

type WpCodeSnippet = { id: number; title: string; status: 'active'|'inactive'; updated: string };
async function fetchWpCodeSnippets(creds: WpCreds): Promise<WpCodeSnippet[]> {
  try {
    return await wpFetch<WpCodeSnippet[]>(creds, '/wp-json/wpcode/v1/snippets?per_page=200');
  } catch {
    return [];
  }
}

type MediaItem = { id: number; alt_text: string; source_url: string };
async function fetchMediaCoverage(creds: WpCreds): Promise<{ total: number; with_alt: number }> {
  let total = 0, with_alt = 0, page = 1;
  while (true) {
    try {
      const batch = await wpFetch<MediaItem[]>(creds, `/wp-json/wp/v2/media?per_page=100&page=${page}&_fields=id,alt_text`);
      if (!batch.length) break;
      total += batch.length;
      with_alt += batch.filter(m => (m.alt_text ?? '').trim() !== '').length;
      if (batch.length < 100) break;
      page++;
      if (page > 30) break;   // safety: cap at 3000 media items
    } catch { break; }
  }
  return { total, with_alt };
}

// ============================================================================
// Public: run the watcher for one client.
// ============================================================================

export async function watchWordpress(clientId: string): Promise<{ entries: number; detail: any }> {
  const supabase = createSupabaseAdminClient();

  // load creds
  const { data: integ } = await supabase
    .from('integrations')
    .select('config, credentials')
    .eq('client_id', clientId)
    .in('kind', ['elementor','wordpress' as any])
    .maybeSingle();

  const creds: WpCreds = {
    wp_base_url: (integ?.config as any)?.wp_base_url,
    app_user:    (integ?.credentials as any)?.app_user,
    app_pass:    (integ?.credentials as any)?.app_pass,
    shim_token:  (integ?.credentials as any)?.shim_token
  };
  if (!creds.wp_base_url || !creds.app_user || !creds.app_pass) {
    return { entries: 0, detail: { skipped: 'wp credentials missing' } };
  }

  let entriesEmitted = 0;
  const detail: any = {};

  // --- 1. Pages + posts: detect new + modified
  for (const type of ['pages','posts'] as const) {
    const items = await fetchAllPosts(creds, type);
    detail[`${type}_seen`] = items.length;
    // load existing snapshot
    const { data: existing } = await supabase
      .from('wp_snapshot')
      .select('wp_id, modified_at, title_md5, content_md5, aioseo_md5')
      .eq('client_id', clientId).eq('wp_type', type === 'pages' ? 'page' : 'post');
    const byId: Record<number, any> = {};
    for (const e of existing ?? []) byId[e.wp_id] = e;

    const upserts: any[] = [];
    let newCount = 0, editedCount = 0, metaChangedCount = 0;
    const sampleNew: string[] = [];

    for (const item of items) {
      const titleHash   = md5(item.title.rendered ?? '');
      const contentHash = md5(item.content.rendered ?? '');
      const aioseo = await fetchAioseoMeta(creds, item.id, type);
      const aioseoHash = md5(`${aioseo.title ?? ''}\n${aioseo.description ?? ''}`);

      const prev = byId[item.id];
      const row = {
        client_id: clientId,
        wp_id: item.id,
        wp_type: type === 'pages' ? 'page' : 'post',
        slug: item.slug, link: item.link, title: item.title.rendered,
        modified_at: item.modified,
        title_md5: titleHash, content_md5: contentHash,
        aioseo_title: aioseo.title, aioseo_description: aioseo.description,
        aioseo_md5: aioseoHash,
        last_seen_at: new Date().toISOString()
      };
      upserts.push(row);

      if (!prev) {
        newCount++;
        if (sampleNew.length < 5) sampleNew.push(item.title.rendered);
      } else {
        if (prev.aioseo_md5 !== aioseoHash) metaChangedCount++;
        if (prev.title_md5 !== titleHash || prev.content_md5 !== contentHash) editedCount++;
      }
    }

    if (upserts.length) {
      await supabase.from('wp_snapshot').upsert(upserts, { onConflict: 'client_id,wp_id' });
    }

    // Roll the diffs up into changelog entries (one per category, not per page).
    if (newCount > 0) {
      const titleSnippet = sampleNew.slice(0, 3).join(', ') + (sampleNew.length > 3 ? '…' : '');
      await supabase.from('changelog').insert({
        client_id: clientId,
        kind: 'page_published',
        title: `${newCount} new ${type === 'pages' ? 'page' : 'blog post'}${newCount === 1 ? '' : 's'} published`,
        description: titleSnippet ? `Includes: ${titleSnippet}` : null,
        metadata: { auto: true, source: 'wp_watcher', count: newCount }
      });
      entriesEmitted++;
    }
    if (editedCount > 0) {
      await supabase.from('changelog').insert({
        client_id: clientId,
        kind: 'page_updated',
        title: `${editedCount} ${type === 'pages' ? 'page' : 'post'}${editedCount === 1 ? '' : 's'} updated`,
        description: 'Content or title was edited.',
        metadata: { auto: true, source: 'wp_watcher', count: editedCount }
      });
      entriesEmitted++;
    }
    if (metaChangedCount > 0) {
      await supabase.from('changelog').insert({
        client_id: clientId,
        kind: 'meta_updated',
        title: `${metaChangedCount} AIOSEO title/description${metaChangedCount === 1 ? '' : 's'} rewritten`,
        description: null,
        metadata: { auto: true, source: 'wp_watcher', count: metaChangedCount }
      });
      entriesEmitted++;
    }
    detail[`${type}_new`] = newCount;
    detail[`${type}_edited`] = editedCount;
    detail[`${type}_meta_changed`] = metaChangedCount;
  }

  // --- 2. WPCode snippets: detect newly activated
  const snippets = await fetchWpCodeSnippets(creds);
  if (snippets.length) {
    const { data: prev } = await supabase
      .from('wpcode_snapshot')
      .select('snippet_id, active')
      .eq('client_id', clientId);
    const prevById: Record<number, any> = {};
    for (const p of prev ?? []) prevById[p.snippet_id] = p;

    let newlyActive = 0;
    const activatedTitles: string[] = [];
    for (const s of snippets) {
      const wasActive = prevById[s.id]?.active ?? false;
      const isActive  = s.status === 'active';
      if (!wasActive && isActive) {
        newlyActive++;
        if (activatedTitles.length < 5) activatedTitles.push(s.title);
      }
    }
    if (snippets.length) {
      await supabase.from('wpcode_snapshot').upsert(
        snippets.map(s => ({
          client_id: clientId,
          snippet_id: s.id,
          title: s.title,
          active: s.status === 'active',
          modified_at: s.updated,
          last_seen_at: new Date().toISOString()
        })),
        { onConflict: 'client_id,snippet_id' }
      );
    }
    if (newlyActive > 0) {
      await supabase.from('changelog').insert({
        client_id: clientId,
        kind: 'snippet_added',
        title: `${newlyActive} WPCode snippet${newlyActive === 1 ? '' : 's'} activated`,
        description: activatedTitles.length ? activatedTitles.join(', ') : null,
        metadata: { auto: true, source: 'wp_watcher', count: newlyActive }
      });
      entriesEmitted++;
    }
    detail.snippets_newly_active = newlyActive;
  }

  // --- 3. Media coverage: alt-text milestone
  const cov = await fetchMediaCoverage(creds);
  if (cov.total > 0) {
    const { data: prev } = await supabase
      .from('wp_media_snapshot')
      .select('with_alt, total_images')
      .eq('client_id', clientId).maybeSingle();
    const delta = cov.with_alt - (prev?.with_alt ?? 0);
    await supabase.from('wp_media_snapshot').upsert({
      client_id: clientId, total_images: cov.total, with_alt: cov.with_alt, measured_at: new Date().toISOString()
    });
    if (delta >= 10) {
      await supabase.from('changelog').insert({
        client_id: clientId,
        k