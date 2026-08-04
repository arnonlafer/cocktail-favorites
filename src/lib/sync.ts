import { DEFAULT_CART_SEARCH_URL } from './cart'
import { buildLossBaseline, confirmIfLargeLoss } from './dataGuard'
import { getDataState, replaceDataFromServer } from './dataStore'
import { getCurrentUserKey, loadLocalUiPrefs, saveLocalUiPrefs } from './localPrefs'
import {
  exportSyncUserData,
  migrateLocalPrefsFromProfile,
  normalizeServerProfiles,
  toServerProfile,
  userKey,
} from './storage'
import type { AiChat, AppPreferences, Cocktail, SyncPayload, UserProfile } from '../types'
import { authHeaders } from './auth'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'not-configured' | 'cancelled'

const SYNC_HEADER = 'X-Sync-Code'
const LEGACY_AI_CHATS_KEY = 'cocktail-favorites:ai-chats'
const LEGACY_GUARD_KEY = 'cocktail-favorites:data-guard-snapshot'

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
    [key]: toServerProfile({
      userName: name,
      favorites: prefs.favorites ?? [],
      unit: prefs.unit ?? 'oz',
      multiplier: prefs.multiplier ?? 1,
      collections: prefs.collections ?? [],
      recipeDraft: '',
      cart: [],
      stock: [],
      lastStockCategory: 'whiskey-other',
      cartSearchUrl: DEFAULT_CART_SEARCH_URL,
      randomFavoritesOnly: true,
      updatedAt: prefs.syncUpdatedAt ?? Date.now(),
    }),
  }
}

function readLegacyAiChats(): AiChat[] {
  try {
    const raw = localStorage.getItem(LEGACY_AI_CHATS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AiChat[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function clearLegacyLocalDataKeys() {
  localStorage.removeItem(LEGACY_AI_CHATS_KEY)
  localStorage.removeItem(LEGACY_GUARD_KEY)
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
    userProfiles: normalizeServerProfiles(userProfiles),
    aiChats: state.aiChats ?? [],
  }
}

export function normalizePayload(payload: SyncPayload): SyncPayload {
  const withProfiles =
    payload.userProfiles && Object.keys(payload.userProfiles).length > 0
      ? payload
      : payload.prefs
        ? {
            ...payload,
            syncCode: payload.syncCode || payload.prefs.syncCode || '',
            userProfiles: legacyPrefsToProfiles(payload.prefs),
          }
        : { ...payload, userProfiles: {} }

  return {
    ...withProfiles,
    userProfiles: normalizeServerProfiles(withProfiles.userProfiles ?? {}),
    aiChats: withProfiles.aiChats ?? [],
  }
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

function mergeAiChats(local: AiChat[], remote: AiChat[]): AiChat[] {
  const map = new Map<string, AiChat>()
  for (const chat of [...local, ...remote]) {
    const existing = map.get(chat.id)
    if (!existing || chat.updatedAt >= existing.updatedAt) map.set(chat.id, chat)
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

function mergeUserProfile(local: UserProfile, remote: UserProfile): UserProfile {
  const preferRemote = remote.updatedAt > local.updatedAt
  const newer = preferRemote ? remote : local
  const older = preferRemote ? local : remote

  return toServerProfile({
    userName: newer.userName || older.userName,
    favorites: mergeFavorites(local.favorites ?? [], remote.favorites ?? []),
    unit: newer.unit,
    multiplier: newer.multiplier,
    collections: mergeById(local.collections ?? [], remote.collections ?? [], preferRemote),
    recipeDraft: mergeRecipeDraft(local.recipeDraft ?? '', remote.recipeDraft ?? '', preferRemote),
    cart: newer.cart ?? [],
    stock: newer.stock ?? [],
    lastStockCategory: newer.lastStockCategory ?? older.lastStockCategory,
    cartSearchUrl: newer.cartSearchUrl ?? older.cartSearchUrl,
    randomFavoritesOnly: newer.randomFavoritesOnly,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  })
}

function mergeUserProfiles(
  local: Record<string, UserProfile>,
  remote: Record<string, UserProfile>,
): Record<string, UserProfile> {
  const merged: Record<string, UserProfile> = {}
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const localProfile = local[key]
    const remoteProfile = remote[key]
    if (!localProfile && remoteProfile) {
      merged[key] = toServerProfile(remoteProfile)
    } else if (localProfile && !remoteProfile) {
      merged[key] = toServerProfile(localProfile)
    } else if (localProfile && remoteProfile) {
      merged[key] = mergeUserProfile(localProfile, remoteProfile)
    }
  }
  return merged
}

export function previewMergedState(payload: SyncPayload): Omit<SyncPayload, 'syncCode'> {
  const current = getDataState()
  const normalized = normalizePayload(payload)
  const legacyChats = readLegacyAiChats()
  return {
    updatedAt: Math.max(current.updatedAt, normalized.updatedAt ?? 0),
    custom: mergeCustom(current.custom, normalized.custom ?? []),
    edits: mergeEdits(current.edits, normalized.edits ?? {}),
    deletedIds: [...new Set([...(normalized.deletedIds ?? []), ...current.deletedIds])],
    nutritionOverrides:
      (normalized.nutritionOverrides?.length ?? 0) > 0
        ? normalized.nutritionOverrides!
        : current.nutritionOverrides,
    userProfiles: mergeUserProfiles(current.userProfiles, normalized.userProfiles ?? {}),
    aiChats: mergeAiChats(
      mergeAiChats(current.aiChats ?? [], legacyChats),
      normalized.aiChats ?? [],
    ),
  }
}

export function applySyncPayload(payload: SyncPayload) {
  const normalized = normalizePayload(payload)
  const merged = previewMergedState(normalized)
  replaceDataFromServer(merged)
  saveLocalUiPrefs({
    syncCode: normalized.syncCode || loadLocalUiPrefs().syncCode,
    lastSyncedAt: Date.now(),
  })

  const currentKey = getCurrentUserKey()
  const profile = (currentKey && merged.userProfiles[currentKey]) || Object.values(merged.userProfiles)[0]
  if (profile) migrateLocalPrefsFromProfile(profile)

  clearLegacyLocalDataKeys()
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
  if (remote) {
    const preview = previewMergedState(remote)
    const baseline = buildLossBaseline()
    if (!confirmIfLargeLoss(baseline, preview, 'Loading from the server')) {
      return 'cancelled'
    }
    applySyncPayload(remote)
  }

  notifySyncApplied()
  return 'synced'
}

/** Upload the current in-memory snapshot to the server. */
export async function pushToServer(syncCode: string): Promise<SyncStatus> {
  const code = syncCode.trim()
  if (!code) return 'not-configured'

  const payload = buildSyncPayload()
  const baseline = buildLossBaseline()
  const uploadPreview: Omit<SyncPayload, 'syncCode'> = {
    updatedAt: payload.updatedAt,
    edits: payload.edits,
    custom: payload.custom,
    deletedIds: payload.deletedIds,
    nutritionOverrides: payload.nutritionOverrides ?? [],
    userProfiles: payload.userProfiles ?? {},
    aiChats: payload.aiChats ?? [],
  }
  if (!confirmIfLargeLoss(baseline, uploadPreview, 'Saving to the server')) {
    return 'cancelled'
  }

  const now = Date.now()
  payload.updatedAt = now
  for (const profile of Object.values(payload.userProfiles ?? {})) {
    profile.updatedAt = Math.max(profile.updatedAt ?? 0, now)
  }

  const uploaded = await uploadPayload(code, payload)
  if (uploaded === 'synced') {
    saveLocalUiPrefs({ lastSyncedAt: now })
    clearLegacyLocalDataKeys()
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
