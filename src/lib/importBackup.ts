import { buildLossBaseline, confirmIfLargeLoss } from './dataGuard'
import { getDataState, replaceDataFromServer } from './dataStore'
import { exportToSyncPayload, type AppExportPayload } from './export'
import { getCurrentUserKey, setCurrentUserKey } from './localPrefs'
import { migrateLocalPrefsFromProfile, toServerProfile } from './storage'
import { normalizePayload } from './sync'
import type { SyncPayload, UserProfile } from '../types'

export interface ImportSections {
  recipes: boolean
  favorites: boolean
  list: boolean
  draft: boolean
  cart: boolean
  stock: boolean
  aiChats: boolean
}

export const DEFAULT_IMPORT_SECTIONS: ImportSections = {
  recipes: true,
  favorites: true,
  list: true,
  draft: true,
  cart: true,
  stock: true,
  aiChats: true,
}

export const IMPORT_SECTION_LABELS: { key: keyof ImportSections; label: string }[] = [
  { key: 'recipes', label: 'Recipes' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'list', label: 'List' },
  { key: 'draft', label: 'Draft' },
  { key: 'cart', label: 'Cart' },
  { key: 'stock', label: 'Stock' },
  { key: 'aiChats', label: 'AI Conversations' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function profileRichness(profile: UserProfile): number {
  return (
    (profile.favorites?.length ?? 0) +
    (profile.collections?.length ?? 0) +
    (profile.cart?.length ?? 0) +
    (profile.stock?.length ?? 0) +
    ((profile.recipeDraft?.trim().length ?? 0) > 0 ? 10 : 0)
  )
}

/** Prefer the imported profile that actually has user data (e.g. arnon over Guest). */
export function pickRichestProfileKey(profiles: Record<string, UserProfile>): string | null {
  let bestKey: string | null = null
  let bestScore = -1
  for (const [key, profile] of Object.entries(profiles)) {
    const score = profileRichness(profile)
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }
  return bestScore > 0 ? bestKey : null
}

export function parseImportFile(raw: string): SyncPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isRecord(parsed)) {
    throw new Error('That file does not look like a cocktail-favorites backup.')
  }
  if (
    !('userProfiles' in parsed) &&
    !('prefs' in parsed) &&
    !('edits' in parsed) &&
    !('custom' in parsed) &&
    !('aiChats' in parsed)
  ) {
    throw new Error('That file is missing cocktail-favorites backup fields.')
  }
  return exportToSyncPayload(parsed as unknown as AppExportPayload | SyncPayload)
}

function touchesProfiles(sections: ImportSections): boolean {
  return sections.favorites || sections.list || sections.draft || sections.cart || sections.stock
}

export function previewSelectiveImport(
  payload: SyncPayload,
  sections: ImportSections,
): Omit<SyncPayload, 'syncCode'> {
  const current = getDataState()
  const normalized = normalizePayload(payload)
  const now = Date.now()

  const next: Omit<SyncPayload, 'syncCode'> = {
    updatedAt: now,
    edits: current.edits,
    custom: current.custom,
    deletedIds: current.deletedIds,
    nutritionOverrides: current.nutritionOverrides ?? [],
    userProfiles: { ...current.userProfiles },
    aiChats: current.aiChats ?? [],
  }

  if (sections.recipes) {
    next.edits = { ...(normalized.edits ?? {}) }
    next.custom = [...(normalized.custom ?? [])]
    next.deletedIds = [...(normalized.deletedIds ?? [])]
    if ((normalized.nutritionOverrides?.length ?? 0) > 0) {
      next.nutritionOverrides = normalized.nutritionOverrides!
    }
  }

  if (sections.aiChats) {
    next.aiChats = [...(normalized.aiChats ?? [])]
  }

  if (touchesProfiles(sections)) {
    for (const [key, remoteProfile] of Object.entries(normalized.userProfiles ?? {})) {
      const local = next.userProfiles[key]
      const base: UserProfile = local
        ? { ...local }
        : toServerProfile({
            ...remoteProfile,
            favorites: remoteProfile.favorites ?? [],
            collections: remoteProfile.collections ?? [],
            recipeDraft: remoteProfile.recipeDraft ?? '',
            cart: remoteProfile.cart ?? [],
            stock: remoteProfile.stock ?? [],
          })

      next.userProfiles[key] = toServerProfile({
        ...base,
        ...(sections.favorites
          ? {
              favorites: remoteProfile.favorites ?? [],
              unit: remoteProfile.unit ?? base.unit,
              multiplier: remoteProfile.multiplier ?? base.multiplier,
              cartSearchUrl: remoteProfile.cartSearchUrl ?? base.cartSearchUrl,
              randomFavoritesOnly: remoteProfile.randomFavoritesOnly ?? base.randomFavoritesOnly,
            }
          : {}),
        ...(sections.list ? { collections: remoteProfile.collections ?? [] } : {}),
        ...(sections.draft ? { recipeDraft: remoteProfile.recipeDraft ?? '' } : {}),
        ...(sections.cart ? { cart: remoteProfile.cart ?? [] } : {}),
        ...(sections.stock
          ? {
              stock: remoteProfile.stock ?? [],
              lastStockCategory: remoteProfile.lastStockCategory ?? base.lastStockCategory,
            }
          : {}),
        updatedAt: now,
      })
    }
  }

  return next
}

/** Apply selected sections from a backup. Returns false if the user cancelled a large-loss warning. */
export function applySelectiveImport(payload: SyncPayload, sections: ImportSections): boolean {
  if (
    !sections.recipes &&
    !sections.favorites &&
    !sections.list &&
    !sections.draft &&
    !sections.cart &&
    !sections.stock &&
    !sections.aiChats
  ) {
    throw new Error('Select at least one section to import.')
  }

  const next = previewSelectiveImport(payload, sections)
  const baseline = buildLossBaseline()
  if (!confirmIfLargeLoss(baseline, next, 'Importing this backup')) {
    return false
  }

  replaceDataFromServer(next)

  const rawProfiles = payload.userProfiles ?? {}
  const richestKey = pickRichestProfileKey(next.userProfiles)
  const currentKey = getCurrentUserKey()
  const currentProfile = currentKey ? next.userProfiles[currentKey] : undefined
  const currentIsEmpty = !currentProfile || profileRichness(currentProfile) === 0

  if (richestKey && (currentIsEmpty || !currentKey || !next.userProfiles[currentKey])) {
    setCurrentUserKey(richestKey)
  }

  const activeKey = getCurrentUserKey()
  const rawProfile =
    (activeKey && rawProfiles[activeKey]) ||
    (richestKey && rawProfiles[richestKey]) ||
    Object.values(rawProfiles)[0]
  if (rawProfile) migrateLocalPrefsFromProfile(rawProfile)

  return true
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsText(file)
  })
}
