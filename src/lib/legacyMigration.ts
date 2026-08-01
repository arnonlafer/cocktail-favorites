import type { Cocktail, IngredientNutrition, UserProfile } from '../types'
import { getDataState, replaceDataFromServer } from './dataStore'

const CUSTOM_KEY = 'cocktail-favorites:custom'
const EDITS_KEY = 'cocktail-favorites:edits'
const DELETED_KEY = 'cocktail-favorites:deleted'
const NUTRITION_KEY = 'cocktail-favorites:nutrition'
const USER_PROFILES_KEY = 'cocktail-favorites:user-profiles'
const PREFS_KEY = 'cocktail-favorites:prefs'

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function mergeCustom(local: Cocktail[], incoming: Cocktail[]): Cocktail[] {
  const map = new Map<string, Cocktail>()
  for (const cocktail of incoming) map.set(cocktail.id, cocktail)
  for (const cocktail of local) {
    if (!map.has(cocktail.id)) map.set(cocktail.id, cocktail)
  }
  return [...map.values()]
}

function mergeEdits(
  local: Record<string, Cocktail>,
  incoming: Record<string, Cocktail>,
): Record<string, Cocktail> {
  return { ...local, ...incoming }
}

function mergeProfiles(
  local: Record<string, UserProfile>,
  incoming: Record<string, UserProfile>,
): Record<string, UserProfile> {
  const merged = { ...local }
  for (const [key, profile] of Object.entries(incoming)) {
    merged[key] = merged[key] ? { ...merged[key], ...profile } : profile
  }
  return merged
}

function clearLegacyLocalStorage() {
  localStorage.removeItem(CUSTOM_KEY)
  localStorage.removeItem(EDITS_KEY)
  localStorage.removeItem(DELETED_KEY)
  localStorage.removeItem(NUTRITION_KEY)
  localStorage.removeItem(USER_PROFILES_KEY)
  localStorage.removeItem(PREFS_KEY)
}

/** Import recipe and profile data still stored in legacy localStorage keys. Returns true if anything was merged. */
export function importLegacyLocalStorageIfPresent(): boolean {
  const custom = readJson<Cocktail[]>(CUSTOM_KEY) ?? []
  const edits = readJson<Record<string, Cocktail>>(EDITS_KEY) ?? {}
  const deletedIds = readJson<string[]>(DELETED_KEY) ?? []
  const nutritionOverrides = readJson<IngredientNutrition[]>(NUTRITION_KEY) ?? []
  let userProfiles = readJson<Record<string, UserProfile>>(USER_PROFILES_KEY) ?? {}

  if (Object.keys(userProfiles).length === 0) {
    const legacyPrefs = readJson<{ userName?: string } & UserProfile>(PREFS_KEY)
    if (legacyPrefs?.userName) {
      const key = legacyPrefs.userName.trim().toLowerCase().replace(/\s+/g, '-')
      userProfiles = { [key]: legacyPrefs as UserProfile }
    }
  }

  const hasLegacyData =
    custom.length > 0 ||
    Object.keys(edits).length > 0 ||
    deletedIds.length > 0 ||
    nutritionOverrides.length > 0 ||
    Object.keys(userProfiles).length > 0

  if (!hasLegacyData) return false

  const current = getDataState()
  replaceDataFromServer({
    updatedAt: current.updatedAt,
    custom: mergeCustom(current.custom, custom),
    edits: mergeEdits(current.edits, edits),
    deletedIds: [...new Set([...current.deletedIds, ...deletedIds])],
    nutritionOverrides: nutritionOverrides.length
      ? nutritionOverrides
      : current.nutritionOverrides,
    userProfiles: mergeProfiles(current.userProfiles, userProfiles),
  })
  // Clear once imported so stale cart/stock/lists are not re-merged on every refresh.
  clearLegacyLocalStorage()
  return true
}
