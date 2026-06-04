import type { AppPreferences, Cocktail, IngredientNutrition, SyncPayload, UserProfile } from '../types'
import { authHeaders } from './auth'
import {
  exportSyncUserData,
  importSyncUserData,
  loadCustomCocktails,
  loadDeletedIds,
  loadEdits,
  loadNutritionOverrides,
  loadPrefs,
  loadSharedSettings,
  runWithoutSync,
  saveCustomCocktails,
  saveDeletedIds,
  saveEdits,
  saveNutritionOverrides,
  saveSharedSettings,
  userKey,
} from './storage'

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
      randomFavoritesOnly: true,
      updatedAt: prefs.syncUpdatedAt ?? Date.now(),
    },
  }
}

export function buildSyncPayload(): SyncPayload {
  const shared = loadSharedSettings()
  const { syncCode, userProfiles } = exportSyncUserData()
  return {
    updatedAt: shared.syncUpdatedAt,
    edits: loadEdits(),
    custom: loadCustomCocktails(),
    deletedIds: loadDeletedIds(),
    nutritionOverrides: loadNutritionOverrides(),
    syncCode,
    userProfiles,
  }
}

function mergeCustomCocktails(
  local: Cocktail[],
  remote: Cocktail[],
  preferRemote: boolean,
): Cocktail[] {
  const byId = new Map<string, Cocktail>()
  const [base, override] = preferRemote ? [local, remote] : [remote, local]
  for (const cocktail of base) byId.set(cocktail.id, cocktail)
  for (const cocktail of override) byId.set(cocktail.id, cocktail)
  return [...byId.values()]
}

function mergeUserProfiles(
  local: Record<string, UserProfile>,
  remote: Record<string, UserProfile>,
): Record<string, UserProfile> {
  const merged = { ...local }
  for (const [key, remoteProfile] of Object.entries(remote)) {
    const localProfile = merged[key]
    if (!localProfile || remoteProfile.updatedAt > localProfile.updatedAt) {
      merged[key] = remoteProfile
    }
  }
  return merged
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

/** Merge payloads; recipe edits use newer updatedAt; each user profile merges independently. */
export function mergeSyncPayload(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const normLocal = normalizePayload(local)
  const normRemote = normalizePayload(remote)
  const preferRemote = normRemote.updatedAt > normLocal.updatedAt

  return {
    updatedAt: Math.max(normLocal.updatedAt, normRemote.updatedAt, Date.now()),
    edits: preferRemote
      ? { ...normLocal.edits, ...normRemote.edits }
      : { ...normRemote.edits, ...normLocal.edits },
    custom: mergeCustomCocktails(normLocal.custom, normRemote.custom, preferRemote),
    deletedIds: [...new Set([...normRemote.deletedIds, ...normLocal.deletedIds])],
    syncCode: normLocal.syncCode || normRemote.syncCode,
    userProfiles: mergeUserProfiles(normLocal.userProfiles, normRemote.userProfiles),
    nutritionOverrides: preferRemote
      ? mergeNutritionOverrides(
          normLocal.nutritionOverrides ?? [],
          normRemote.nutritionOverrides ?? [],
        )
      : mergeNutritionOverrides(
          normRemote.nutritionOverrides ?? [],
          normLocal.nutritionOverrides ?? [],
        ),
  }
}

function mergeNutritionOverrides(
  base: IngredientNutrition[],
  override: IngredientNutrition[],
): IngredientNutrition[] {
  const byId = new Map<string, IngredientNutrition>()
  for (const entry of base) byId.set(entry.id, entry)
  for (const entry of override) byId.set(entry.id, entry)
  return [...byId.values()]
}

function hasSyncableData(payload: SyncPayload): boolean {
  return (
    payload.updatedAt > 0 ||
    Object.keys(payload.edits).length > 0 ||
    payload.custom.length > 0 ||
    payload.deletedIds.length > 0 ||
    (payload.nutritionOverrides?.length ?? 0) > 0 ||
    Object.keys(payload.userProfiles ?? {}).length > 0
  )
}

export function applySyncPayload(payload: SyncPayload) {
  const normalized = normalizePayload(payload)
  const localSyncCode = loadSharedSettings().syncCode

  runWithoutSync(() => {
    saveEdits(normalized.edits ?? {})
    saveCustomCocktails(normalized.custom ?? [])
    saveDeletedIds(normalized.deletedIds ?? [])
    saveNutritionOverrides(normalized.nutritionOverrides ?? [])

    importSyncUserData(
      normalized.syncCode || localSyncCode,
      normalized.userProfiles ?? {},
      true,
    )

    const shared = loadSharedSettings()
    shared.syncUpdatedAt = normalized.updatedAt
    shared.lastSyncedAt = Date.now()
    saveSharedSettings(shared)
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

export function syncAfterRecipeChange() {
  const code = loadPrefs().syncCode?.trim()
  if (!code) return
  void syncNow(code)
}

export function syncAfterNutritionChange() {
  const code = loadPrefs().syncCode?.trim()
  if (!code) return
  void syncNow(code)
}

export function syncAfterPrefsChange() {
  const code = loadPrefs().syncCode?.trim()
  if (!code) return
  void syncNow(code)
}

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
  notifySyncApplied()
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
  if (uploaded === 'synced') notifySyncApplied()
  return uploaded
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