import { DEFAULT_CART_SEARCH_URL } from './cart'
import { getDataState, replaceDataFromServer } from './dataStore'
import { loadLocalUiPrefs, saveLocalUiPrefs } from './localPrefs'
import {
  exportSyncUserData,
  userKey,
} from './storage'
import type { AppPreferences, Cocktail, SyncPayload, UserProfile } from '../types'
import { authHeaders } from './auth'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'not-configured'

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

function mergeCustom(local: Cocktail[], remote: Cocktail[]): Cocktail[] {
  const map = new Map<string, Cocktail>()
  for (const cocktail of remote) map.set(cocktail.id, cocktail)
  for (const cocktail of local) {
    if (!map.has(cocktail.id)) map.set(cocktail.id, cocktail)
  }
  return [...map.values()]
}

function mergeEdits(
  local: Record<string, Cocktail>,
  remote: Record<string, Cocktail>,
): Record<string, Cocktail> {
  return { ...local, ...remote }
}

function mergeRecentlyViewed(
  local: Record<string, number>,
  remote: Record<string, number>,
): Record<string, number> {
  const merged = { ...local }
  for (const [id, ts] of Object.entries(remote)) {
    merged[id] = Math.max(merged[id] ?? 0, ts)
  }
  return merged
}

function mergeFavorites(local: string[], remote: string[]): string[] {
  return [...new Set([...local, ...remote])]
}

function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  preferRemote: boolean,
): T[] {
  const byId = new Map<string, T>()
  const [first, second] = preferRemote ? [local, remote] : [remote, local]
  for (const item of first) byId.set(item.id, item)
  for (const item of second) byId.set(item.id, item)
  return [...byId.values()]
}

function mergeRecipeDraft(local: string, remote: string, preferRemote: boolean): string {
  const localText = local.trim()
  const remoteText = remote.trim()
  if (!localText) return remote
  if (!remoteText) return local
  return preferRemote ? remote : local
}

function mergeUserProfile(local: UserProfile, remote: UserProfile): UserProfile {
  const preferRemote = remote.updatedAt > local.updatedAt
  const newer = preferRemote ? remote : local
  const older = preferRemote ? local : remote

  return {
    userName: newer.userName || older.userName,
    favorites: mergeFavorites(local.favorites ?? [], remote.favorites ?? []),
    recentlyViewed: mergeRecentlyViewed(local.recentlyViewed ?? {}, remote.recentlyViewed ?? {}),
    unit: newer.unit,
    multiplier: newer.multiplier,
    theme: newer.theme,
    fontSize: newer.fontSize,
    collapsedGroups: newer.collapsedGroups,
    listView: newer.listView,
    collections: mergeById(local.collections ?? [], remote.collections ?? [], preferRemote),
    recipeDraft: mergeRecipeDraft(local.recipeDraft ?? '', remote.recipeDraft ?? '', preferRemote),
    // Cart and stock are full-list edits (add/remove/clear). Union-merge would
    // resurrect deleted items from the older side or from legacy localStorage.
    cart: newer.cart ?? [],
    stock: newer.stock ?? [],
    lastStockCategory: newer.lastStockCategory ?? older.lastStockCategory,
    cartSearchUrl: newer.cartSearchUrl ?? older.cartSearchUrl,
    randomFavoritesOnly: newer.randomFavoritesOnly,
    homeGroupView: newer.homeGroupView,
    cocktailSort: newer.cocktailSort,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  }
}

function mergeUserProfiles(
  local: Record<string, UserProfile>,
  remote: Record<string, UserProfile>,
): Record<string, UserProfile> {
  const merged = { ...local }
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const localProfile = local[key]
    const remoteProfile = remote[key]
    if (!localProfile && remoteProfile) {
      merged[key] = remoteProfile
    } else if (localProfile && !remoteProfile) {
      merged[key] = localProfile
    } else if (localProfile && remoteProfile) {
      merged[key] = mergeUserProfile(localProfile, remoteProfile)
    }
  }
  return merged
}

export function applySyncPayload(payload: SyncPayload) {
  const current = getDataState()
  const normalized = normalizePayload(payload)
  replaceDataFromServer({
    updatedAt: Math.max(current.updatedAt, normalized.updatedAt ?? 0),
    custom: mergeCustom(current.custom, normalized.custom ?? []),
    edits: mergeEdits(current.edits, normalized.edits ?? {}),
    deletedIds: [...new Set([...(normalized.deletedIds ?? []), ...current.deletedIds])],
    nutritionOverrides:
      (normalized.nutritionOverrides?.length ?? 0) > 0
        ? normalized.nutritionOverrides!
        : current.nutritionOverrides,
    userProfiles: mergeUserProfiles(current.userProfiles, normalized.userProfiles ?? {}),
  })
  saveLocalUiPrefs({
    syncCode: normalized.syncCode || loadLocalUiPrefs().syncCode,
    lastSyncedAt: Date.now(),
  })
}

async function fetchRemotePayload(code: string): Promise<SyncPayload | null | 'not-configured' | 'error'> {
  try {
    const res = await fetch('/api/sync', {
      cache: 'no-store',
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
      cache: 'no-store',
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

/** Download the latest server snapshot and merge with in-memory data. */
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
  const now = Date.now()
  payload.updatedAt = now
  for (const profile of Object.values(payload.userProfiles ?? {})) {
    profile.updatedAt = Math.max(profile.updatedAt ?? 0, now)
  }

  const uploaded = await uploadPayload(code, payload)
  if (uploaded === 'synced') {
    saveLocalUiPrefs({ lastSyncedAt: now })
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
      cache: 'no-store',
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
