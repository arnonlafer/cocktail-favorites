import type { AppPreferences, SyncPayload } from '../types'
import { authHeaders } from './auth'
import {
  loadCustomCocktails,
  loadDeletedIds,
  loadEdits,
  loadPrefs,
  runWithoutSync,
  saveCustomCocktails,
  saveDeletedIds,
  saveEdits,
  savePrefs,
} from './storage'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'not-configured'

const SYNC_HEADER = 'X-Sync-Code'
const PREFS_KEY = 'cocktail-favorites:prefs'

export function buildSyncPayload(): SyncPayload {
  const prefs = loadPrefs()
  return {
    updatedAt: prefs.syncUpdatedAt || Date.now(),
    edits: loadEdits(),
    custom: loadCustomCocktails(),
    deletedIds: loadDeletedIds(),
    prefs,
  }
}

export function applySyncPayload(remote: SyncPayload) {
  const syncCode = loadPrefs().syncCode
  runWithoutSync(() => {
    saveEdits(remote.edits ?? {})
    saveCustomCocktails(remote.custom ?? [])
    saveDeletedIds(remote.deletedIds ?? [])
    const mergedPrefs: AppPreferences = {
      ...loadPrefs(),
      ...remote.prefs,
      syncCode,
      syncUpdatedAt: remote.updatedAt,
      lastSyncedAt: Date.now(),
    }
    savePrefs(mergedPrefs)
  })
}

export function touchLocalSyncTimestamp() {
  const prefs = loadPrefs()
  prefs.syncUpdatedAt = Date.now()
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
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
      headers: { ...authHeaders(), [SYNC_HEADER]: code },
    })

    if (res.status === 503) return 'not-configured'
    if (!res.ok) return 'error'

    const { data } = (await res.json()) as { data: SyncPayload | null }
    const local = buildSyncPayload()

    if (!data) {
      return pushSync(code)
    }

    if (data.updatedAt >= local.updatedAt) {
      applySyncPayload(data)
    } else {
      return pushSync(code)
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
        ...authHeaders(),
        [SYNC_HEADER]: code,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (res.status === 503) return 'not-configured'
    if (!res.ok) return 'error'

    const prefs = loadPrefs()
    prefs.lastSyncedAt = Date.now()
    runWithoutSync(() => savePrefs(prefs))
    return 'synced'
  } catch {
    return 'error'
  }
}

export async function syncNow(syncCode: string): Promise<SyncStatus> {
  const pulled = await pullSync(syncCode)
  if (pulled === 'error') return 'error'
  if (pulled === 'not-configured') return 'not-configured'
  return pushSync(syncCode)
}

export function formatSyncTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString()
}
