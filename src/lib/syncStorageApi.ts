import { authHeaders } from './auth'
import { loadPrefs } from './storage'

const SYNC_HEADER = 'X-Sync-Code'

export type SyncBackend = 'kv' | 'd1'
export type CopyDirection = 'kv-to-d1' | 'd1-to-kv'

export interface SyncStorageStatus {
  backend: SyncBackend
  kvConfigured: boolean
  d1Configured: boolean
  kvHasData: boolean | null
  d1HasData: boolean | null
}

export async function fetchSyncStorageStatus(syncCode?: string): Promise<SyncStorageStatus | null> {
  const code = (syncCode ?? loadPrefs().syncCode ?? '').trim()
  try {
    const headers: Record<string, string> = { ...authHeaders() }
    if (code) headers[SYNC_HEADER] = code
    const res = await fetch('/api/sync/storage', {
      cache: 'no-store',
      headers,
    })
    if (!res.ok) return null
    return (await res.json()) as SyncStorageStatus
  } catch {
    return null
  }
}

export async function copySyncStorage(
  direction: CopyDirection,
  syncCode?: string,
): Promise<{ ok: true; bytes: number; from: SyncBackend; to: SyncBackend } | { ok: false; error: string }> {
  const code = (syncCode ?? loadPrefs().syncCode ?? '').trim()
  if (!code) return { ok: false, error: 'Enter a sync code first.' }

  try {
    const res = await fetch('/api/sync/storage', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        ...authHeaders(),
        [SYNC_HEADER]: code,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ direction }),
    })
    const body = (await res.json()) as {
      ok?: boolean
      bytes?: number
      from?: SyncBackend
      to?: SyncBackend
      error?: string
    }
    if (!res.ok || !body.ok || body.bytes == null || !body.from || !body.to) {
      return { ok: false, error: body.error || 'Copy failed.' }
    }
    return { ok: true, bytes: body.bytes, from: body.from, to: body.to }
  } catch {
    return { ok: false, error: 'Copy failed. Check your connection and sign-in.' }
  }
}

export function backendLabel(backend: SyncBackend): string {
  return backend === 'd1' ? 'D1 (SQL)' : 'Workers KV'
}
