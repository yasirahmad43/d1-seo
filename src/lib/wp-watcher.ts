// WP watcher — stubbed for v1. Real implementation re-added after first deploy is green.
export async function watchWordpress(_clientId: string): Promise<{ entries: number; detail: any }> {
  return { entries: 0, detail: { stubbed: true } };
}
