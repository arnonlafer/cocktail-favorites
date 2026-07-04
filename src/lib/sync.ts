import { DEFAULT_CART_SEARCH_URL } from './cart'
import { clearDataDirty, getDataState, replaceDataFromServer } from './dataStore'
import { loadLocalUiPrefs, saveLocalUiPrefs } from './localPrefs'
import {
  exportSyncUserData,
  userKey,
} from './storage'
import type { AppPreferences, SyncPayload, UserProfile } from '../types'
import { authHeaders } from './auth'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'not-configured' | 'dirty-blocked'

const SYNC_HEADER = 'X-Sync-Code'

const syncAppliedListeners = new Set<() => void>()

export function subscribeSyncApplied(listener: () => void) {
  syncAppliedListeners.add(listener)
  return () => {
    void syncAppliedListeners.delete(listener)
  }
}

function notifySyncApplied() {
  syncAppliedListeners.forEach((listener) => listener())
}

function legacyPrefsToProfiles(prefs: AppPreferences): Record<string, UserProfile> {
  const name = prefs.userName?.trim() || 'Guest'
  const key = userKey(name)
  return {
    [key]: {
      userName: name,
      favorites: prefs.favorites ?? [],
      recentlyViewed: prefs.recentlyViewed ?? {},
      unit: prefs.unit ?? 'oz',
      multiplier: prefs.multiplier ?? 1,
      theme: prefs.theme ?? 'dark',
      fontSize: prefs.fontSize ?? 'md',
      collapsedGroups: prefs.collapsedGroups ?? null,
      listView: prefs.listView ?? 'list',
      collections: prefs.collections ?? [],
      recipeDraft: '',
      cart: [],
      stock: [],
      lastStockCategory: 'whiskey-other',
      cartSearchUrl: DEFAULT_CART_SEARCH_URL,
      randomFavoritesOnly: true,
      homeGroupView: 'spirits',
      cocktailSort: 'recent',
      updatedAt: prefs.syncUpdatedAt ?? Date.now(),
    },
  }
}

export function buildSyncPayload(): SyncPayload {
  const localUi = loadLocalUiPrefs()
  const { userProfiles } = exportSyncUserData()
  const state = getDataState()
  return {
    updatedAt: state.updatedAt || Date.now(),
    edits: state.edits,
    custom: state.custom,
    deletedIds: state.deletedIds,
    nutritionOverrides: state.nutritionOverrides ?? [],
    syncCode: localUi.syncCode,
    userProfiles,
  }
}

function normalizePayload(payload: SyncPayload): SyncPayload {
  if (payload.userProfiles && Object.keys(payload.userProfiles).length > 0) {
    return payload
  }
  if (payload.prefs) {
    return {
      ...payload,
      syncCode: payload.syncCode || payload.prefs.syncCode || '',
      userProfiles: legacyPrefsToProfiles(payload.prefs),
    }
  }
  return { ...payload, userProfiles: {} }
}

export function applySyncPayload(payload: SyncPayload) {
  replaceDataFromServer(normalizePayload(payload))
  const normalized = normalizePayload(payload)
  saveLocalUiPrefs({
    syncCode: normalized.syncCode || loadLocalUiPrefs().syncCode,
    lastSyncedAt: Date.now(),
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

/** Download the latest server snapshot and replace in-memory data. */
export async function pullFromServer(syncCode: string): Promise<SyncStatus> {
  const code = syncCode.trim()
  if (!code) return 'not-configured'

  const remote = await fetchRemotePayload(code)
  if (remote === 'not-configured') return 'not-configured'
  if (remote === 'error') return 'error'
  if (remote) applySyncPayload(remote)

  notifySyncApplied()
  return 'synced'
}

/** Upload the current in-memory snapshot to the server. */
export async function pushToServer(syncCode: string): Promise<SyncStatus> {
  const code = syncCode.trim()
  if (!code) return 'not-configured'

  const payload = buildSyncPayload()
  payload.updatedAt = Date.now()
  const uploaded = await uploadPayload(code, payload)
  if (uploaded === 'synced') {
    clearDataDirty()
    saveLocalUiPrefs({ lastSyncedAt: Date.now() })
    notifySyncApplied()
  }
  return uploaded
}

export async function pullSync(syncCode: string): Promise<SyncStatus> {
  return pullFromServer(syncCode)
}

export function formatSyncTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString()
}

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
