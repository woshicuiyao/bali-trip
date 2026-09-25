import type { TripStore, StoredSnapshot } from './handler.ts';
import type { AccessConfig } from './access.ts';

export function createStore(projectUrl: string, serviceKey: string): TripStore & { readAccess(): Promise<AccessConfig> } {
  const endpoint = `${projectUrl.replace(/\/$/, '')}/rest/v1/journeys?id=eq.bali-2026`;
  async function request(url: string, init: RequestInit = {}) {
    const result = await fetch(url, { ...init,
      headers: { apikey: serviceKey, ...(serviceKey.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${serviceKey}` }),
        'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers },
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) throw new Error('Database unavailable');
    return result.json();
  }
  return {
    async readAccess() {
      const rows = await request(`${projectUrl.replace(/\/$/, '')}/rest/v1/journey_access?id=eq.bali-2026&select=edit_hash,view_hashes`);
      if (!rows[0]) throw Error('Invitations have not been imported');
      return { editHash: rows[0].edit_hash, viewHashes: rows[0].view_hashes };
    },
    async read() {
      const rows = await request(`${endpoint}&select=data,version,updated_at`);
      const row = rows[0];
      if (!row || !row.data || !Number.isInteger(row.version)) throw new Error('Trip has not been imported');
      return { data: row.data, version: row.version, updatedAt: row.updated_at };
    },
    async compareAndSet(snapshot: StoredSnapshot, expectedVersion: number) {
      const rows = await request(`${endpoint}&version=eq.${expectedVersion}&select=version`, {
        method: 'PATCH', body: JSON.stringify({ data: snapshot.data,
          version: snapshot.version, updated_at: snapshot.updatedAt }),
      });
      return rows.length === 1;
    },
  };
}
