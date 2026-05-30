import type { AppPreferences, Cocktail, SyncPayload } from '../types'
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

export function buildSyncPayload(): SyncPayload {
  const prefs = loadPrefs()
  return {
    updatedAt: prefs.syncUpdatedAt,
    edits: loadEdits(),
    custom: loadCustomCocktails(),
    deletedIds: loadDeletedIds(),
    prefs,
  }
}

function mergeCustomCocktails(local: Cocktail[], remote: Cocktail[]): Cocktail[] {
  const byId = new Map<string, Cocktail>()
  for (const cocktail of remote) byId.set(cocktail.id, cocktail)
  for (const cocktail of local) byId.set(cocktail.id, cocktail)
  return [...byId.values()]
}

/** Merge remote into local; local wins when both changed the same record. */
export function mergeSyncPayload(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const syncCode = local.prefs.syncCode || remote.prefs.syncCode
  const mergedPrefs: AppPreferences = {
    ...remote.prefs,
    ...local.prefs,
    syncCode,
    favorites: [...new Set([...remote.prefs.favorites, ...local.prefs.favorites])],
    recentlyViewed: { ...remote.prefs.recentlyViewed, ...local.prefs.recentlyViewed },
    collapsedGroups: local.prefs.collapsedGroups ?? remote.prefs.collapsedGroups,
    lastSyncedAt: Date.now(),
  }

  return {
    updatedAt: Math.max(local.updatedAt, remote.updatedAt, Date.now()),
    edits: { ...remote.edits, ...local.edits },
    custom: mergeCustomCocktails(local.custom, remote.custom),
    deletedIds: [...new Set([...remote.deletedIds, ...local.deletedIds])],
    prefs: mergedPrefs,
  }
}

function hasSyncableData(payload: SyncPayload): boolean {
  return (
    payload.updatedAt > 0 ||
    Object.keys(payload.edits).length > 0 ||
    payload.custom.length > 0 ||
    payload.deletedIds.length > 0
  )
}

export function applySyncPayload(payload: SyncPayload) {
  const syncCode = loadPrefs().syncCode
  runWithoutSync(() => {
    saveEdits(payload.edits ?? {})
    saveCustomCocktails(payload.custom ?? [])
    saveDeletedIds(payload.deletedIds ?? [])
    savePrefs({
      ...loadPrefs(),
      ...payload.prefs,
      syncCode,
      syncUpdatedAt: payload.updatedAt,
      lastSyncedAt: Date.now(),
    })
  })
}

async function fetchRemotePayload(code: string): Promise<SyncPayload | null | 'not-configured' | 'error'> {
  try {
    const res = await fetch('/api/sync', {
      headers: { ...authHeaders(), [SYNC_HEADER]: code },
    })

    if (res.status === 503) return 'not-configured'
    if (!res.ok) return 'error'

    const { data } = (await res.json()) as { data: SyncPayload | null }
    return data
  } catch {
    return 'error'
  }
}

async function uploadPayload(code: string, payload: SyncPayload): Promise<SyncStatus> {
  try {
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
    return 'synced'
  } catch {
    return 'error'
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleSyncPush() {
  const code = loadPrefs().syncCode?.trim()
  if (!code) return

  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void syncNow(code)
  }, 800)
}

export async function pullSync(syncCode: string): Promise<SyncStatus> {
  const code = syncCode.trim()
  if (!code) return 'not-configured'

  const remote = await fetchRemotePayload(code)
  if (remote === 'not-configured') return 'not-configured'
  if (remote === 'error') return 'error'
  if (!remote) return 'synced'

  const local = buildSyncPayload()
  applySyncPayload(mergeSyncPayload(local, remote))
  return 'synced'
}

export async function pushSync(syncCode: string): Promise<SyncStatus> {
  return syncNow(syncCode)
}

export async function syncNow(syncCode: string): Promise<SyncStatus> {
  const code = syncCode.trim()
  if (!code) return 'not-configured'

  const local = buildSyncPayload()
  const remote = await fetchRemotePayload(code)

  if (remote === 'not-configured') return 'not-configured'
  if (remote === 'error') return 'error'

  const merged = remote ? mergeSyncPayload(local, remote) : { ...local, updatedAt: Date.now() }

  if (!remote && !hasSyncableData(local)) return 'synced'

  merged.updatedAt = Date.now()
  applySyncPayload(merged)

  const uploaded = await uploadPayload(code, merged)
  return uploaded
}

export function formatSyncTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString()
}

/** Returns whether the server has cloud storage (KV) connected. */
export async function checkSyncServer(): Promise<'ready' | 'not-configured' | 'error'> {
  try {
    const res = await fetch('/api/sync', {
      headers: { ...authHeaders(), [SYNC_HEADER]: 'probe' },
    })
    if (res.status === 503) return 'not-configured'
    if (res.status === 401) return 'ready'
    if (!res.ok) return 'error'
    return 'ready'
  } catch {
    return 'error'
  }
}
