import type { AppPreferences, Cocktail } from '../types'
import type { SyncPayload } from '../../worker/sync-types'
import {
  loadCustomCocktails,
  loadEdits,
  loadPrefs,
  saveCustomCocktails,
  saveEdits,
  savePrefs,
} from './storage'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'not-configured'

const SYNC_HEADER = 'X-Sync-Code'

export function buildSyncPayload(): SyncPayload {
  const prefs = loadPrefs()
  return {
    updatedAt: prefs.syncUpdatedAt ?? Date.now(),
    edits: loadEdits(),
    custom: loadCustomCocktails(),
    prefs,
  }
}

export function applySyncPayload(remote: SyncPayload) {
  saveEdits(remote.edits ?? {})
  saveCustomCocktails(remote.custom ?? [])
  const current = loadPrefs()
  savePrefs({
    ...current,
    ...remote.prefs,
    syncCode: current.syncCode,
    syncUpdatedAt: remote.updatedAt,
    lastSyncedAt: Date.now(),
  })
}

export function touchLocalSyncTimestamp() {
  const prefs = loadPrefs()
  prefs.syncUpdatedAt = Date.now()
  savePrefs(prefs)
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleSyncPush() {
  const code = loadPrefs().syncCode?.trim()
  if (!code) return

  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void pushSync(code)
  }, 800)
}

export async function pullSync(syncCode: string): Promise<SyncStatus> {
  const code = syncCode.trim()
  if (!code) return 'not-configured'

  try {
    const res = await fetch('/api/sync', {
      headers: { [SYNC_HEADER]: code },
    })

    if (res.status === 503) return 'not-configured'
    if (!res.ok) return 'error'

    const { data } = (await res.json()) as { data: SyncPayload | null }
    const local = buildSyncPayload()

    if (!data) {
      await pushSync(code)
      return 'synced'
    }

    if (data.updatedAt >= local.syncUpdatedAt) {
      applySyncPayload(data)
    } else {
      await pushSync(code)
    }

    return 'synced'
  } catch {
    return 'error'
  }
}

export async function pushSync(syncCode: string): Promise<SyncStatus> {
  const code = syncCode.trim()
  if (!code) return 'not-configured'

  try {
    touchLocalSyncTimestamp()
    const payload = buildSyncPayload()

    const res = await fetch('/api/sync', {
      method: 'PUT',
      headers: {
        [SYNC_HEADER]: code,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (res.status === 503) return 'not-configured'
    if (!res.ok) return 'error'

    const prefs = loadPrefs()
    prefs.lastSyncedAt = Date.now()
    savePrefs(prefs)
    return 'synced'
  } catch {
    return 'error'
  }
}

export function formatSyncTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString()
}
