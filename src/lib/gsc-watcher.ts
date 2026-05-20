// GSC delta watcher — stubbed for v1.
export async function watchGsc(_clientId: string): Promise<{ entries: number; detail: any }> {
  return { entries: 0, detail: { stubbed: true } };
}
