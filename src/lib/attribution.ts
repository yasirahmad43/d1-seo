// Derives the normalized source bucket from raw attribution fields captured
// by WPCode snippet 5820 (or any equivalent).

export type RawAttribution = {
  utm_source?: string | null;
  utm_medium?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  msclkid?: string | null;
  referrer?: string | null;
};

export function deriveSourceBucket(a: RawAttribution): string {
  const src = (a.utm_source || '').toLowerCase();
  const med = (a.utm_medium || '').toLowerCase();
  const ref = (a.referrer || '').toLowerCase();

  // explicit UTMs win
  if (med === 'organic') return 'organic';
  if (med === 'cpc' || med === 'paid') return 'paid';
  if (med === 'social') return 'social';
  if (med === 'email') return 'email';
  if (med === 'ai') return 'ai';
  if (med === 'referral') return 'referral';

  // click-id inference
  if (a.fbclid) return 'paid';     // facebook/cpc
  if (a.gclid) return 'paid';      // google/cpc
  if (a.msclkid) return 'paid';    // bing/cpc

  // referrer sniff
  if (ref.includes('google.')) return 'organic';
  if (ref.includes('bing.com')) return 'organic';
  if (ref.includes('duckduckgo.')) return 'organic';
  if (ref.includes('facebook.') || ref.includes('l.facebook') || ref.includes('instagram.')) return 'social';
  if (ref.includes('chatgpt.') || ref.includes('claude.ai') || ref.includes('perplexity.') || ref.includes('gemini.')) return 'ai';
  if (ref) return 'referral';

  return 'direct';
}
