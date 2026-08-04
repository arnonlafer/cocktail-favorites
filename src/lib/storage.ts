import { DEFAULT_CART_SEARCH_URL } from './cart'
import {
  loadCustomCocktails,
  loadDeletedIds,
  loadEdits,
  loadNutritionOverrides,
  loadUserProfiles,
  saveCustomCocktails,
  saveDeletedIds,
  saveEdits,
  saveNutritionOverrides,
  saveUserProfiles,
  touchDataUpdatedAt,
} from './dataStore'
import {
  getCurrentUserKey,
  loadLocalUiPrefs,
  saveLocalUiPrefs,
  setCurrentUserKey,
} from './localPrefs'
import { normalizeStockCategory } from './stock'
import type {
  AppPreferences,
  Collection,
  Theme,
  UnitSystem,
  UserProfile,
} from '../types'

export const DEFAULT_SYNC_CODE = 'arnon'

export function userKey(userName: string): string {
  return userName.trim().toLowerCase().replace(/\s+/g, '-')
}

function defaultProfile(userName: string): UserProfile {
  return {
    userName: userName.trim(),
    favorites: [],
    unit: 'oz',
    multiplier: 1,
    collections: [],
    recipeDraft: '',
    cart: [],
    stock: [],
    lastStockCategory: 'whiskey-other',
    cartSearchUrl: DEFAULT_CART_SEARCH_URL,
    randomFavoritesOnly: true,
    updatedAt: Date.now(),
  }
}

/** Strip local-only fields before writing profiles to the sync payload. */
export function toServerProfile(profile: UserProfile): UserProfile {
  return {
    userName: profile.userName,
    favorites: profile.favorites ?? [],
    unit: profile.unit ?? 'oz',
    multiplier: profile.multiplier ?? 1,
    collections: profile.collections ?? [],
    recipeDraft: profile.recipeDraft ?? '',
    cart: profile.cart ?? [],
    stock: profile.stock ?? [],
    lastStockCategory: normalizeStockCategory(profile.lastStockCategory),
    cartSearchUrl: profile.cartSearchUrl?.trim() || DEFAULT_CART_SEARCH_URL,
    randomFavoritesOnly: profile.randomFavoritesOnly ?? true,
    updatedAt: profile.updatedAt ?? Date.now(),
  }
}

export function normalizeServerProfiles(
  profiles: Record<string, UserProfile>,
): Record<string, UserProfile> {
  const out: Record<string, UserProfile> = {}
  for (const [key, profile] of Object.entries(profiles)) {
    out[key] = toServerProfile(profile)
  }
  return out
}

/** One-time: copy view/recent fields from a legacy synced profile into local prefs. */
export function migrateLocalPrefsFromProfile(profile: UserProfile) {
  const local = loadLocalUiPrefs()
  const patch: Parameters<typeof saveLocalUiPrefs>[0] = {}

  if (Object.keys(local.recentlyViewed).length === 0 && profile.recentlyViewed) {
    patch.recentlyViewed = profile.recentlyViewed
  }
  if (local.collapsedGroups === null && profile.collapsedGroups != null) {
    patch.collapsedGroups = profile.collapsedGroups
  }
  if (local.listView === 'list' && profile.listView && profile.listView !== 'list') {
    patch.listView = profile.listView
  }
  if (local.homeGroupView === 'spirits' && profile.homeGroupView && profile.homeGroupView !== 'spirits') {
    patch.homeGroupView = profile.homeGroupView
  }
  if (local.cocktailSort === 'recent' && profile.cocktailSort && profile.cocktailSort !== 'recent') {
    patch.cocktailSort = profile.cocktailSort
  }

  if (Object.keys(patch).length > 0) saveLocalUiPrefs(patch)
}

function profileToPrefs(profile: UserProfile, localUi: ReturnType<typeof loadLocalUiPrefs>): AppPreferences {
  return {
    userName: profile.userName,
    favorites: profile.favorites,
    recentlyViewed: localUi.recentlyViewed ?? {},
    unit: profile.unit,
    multiplier: profile.multiplier,
    theme: localUi.theme === 'dim' || localUi.theme === 'light' ? localUi.theme : 'dark',
    fontSize: localUi.fontSize,
    collapsedGroups: localUi.collapsedGroups,
    listView: localUi.listView ?? 'list',
    collections: profile.collections,
    recipeDraft: profile.recipeDraft ?? '',
    cart: profile.cart ?? [],
    stock: profile.stock ?? [],
    lastStockCategory: normalizeStockCategory(profile.lastStockCategory),
    cartSearchUrl: profile.cartSearchUrl?.trim() || DEFAULT_CART_SEARCH_URL,
    randomFavoritesOnly: profile.randomFavoritesOnly ?? true,
    homeGroupView: localUi.homeGroupView ?? 'spirits',
    cocktailSort: localUi.cocktailSort ?? 'recent',
    syncCode: localUi.syncCode,
    syncUpdatedAt: 0,
    lastSyncedAt: localUi.lastSyncedAt,
  }
}

function getCurrentProfile(): UserProfile {
  const key = getCurrentUserKey()
  const profiles = loadUserProfiles()
  if (key && profiles[key]) return profiles[key]!

  const firstKey = Object.keys(profiles)[0]
  if (firstKey) {
    setCurrentUserKey(firstKey)
    return profiles[firstKey]!
  }

  return defaultProfile('Guest')
}

export function loadPrefs(): AppPreferences {
  return profileToPrefs(getCurrentProfile(), loadLocalUiPrefs())
}

export function saveLocalAppearance(theme: Theme, fontSize: AppPreferences['fontSize']) {
  saveLocalUiPrefs({ theme, fontSize })
}

export function saveSyncCode(syncCode: string) {
  saveLocalUiPrefs({ syncCode })
}

export function savePrefs(prefs: AppPreferences) {
  const key = getCurrentUserKey() || userKey(prefs.userName || 'Guest')
  if (!getCurrentUserKey()) setCurrentUserKey(key)

  saveLocalUiPrefs({
    recentlyViewed: prefs.recentlyViewed ?? {},
    collapsedGroups: prefs.collapsedGroups,
    listView: prefs.listView,
    homeGroupView: prefs.homeGroupView,
    cocktailSort: prefs.cocktailSort,
    ...(prefs.syncCode !== undefined ? { syncCode: prefs.syncCode } : {}),
  })

  const profiles = loadUserProfiles()
  const existing = profiles[key] ?? defaultProfile(prefs.userName || 'Guest')
  const nextProfile = toServerProfile({
    ...existing,
    userName: prefs.userName,
    favorites: prefs.favorites,
    unit: prefs.unit,
    multiplier: prefs.multiplier,
    collections: prefs.collections ?? [],
    recipeDraft: prefs.recipeDraft ?? '',
    cart: prefs.cart ?? [],
    stock: prefs.stock ?? [],
    lastStockCategory: normalizeStockCategory(prefs.lastStockCategory),
    cartSearchUrl: prefs.cartSearchUrl?.trim() || DEFAULT_CART_SEARCH_URL,
    randomFavoritesOnly: prefs.randomFavoritesOnly ?? true,
    updatedAt: existing.updatedAt,
  })

  const { updatedAt: _a, ...existingCore } = toServerProfile(existing)
  const { updatedAt: _b, ...nextCore } = nextProfile
  if (JSON.stringify(existingCore) !== JSON.stringify(nextCore)) {
    profiles[key] = { ...nextProfile, updatedAt: Date.now() }
    saveUserProfiles(profiles)
    touchDataUpdatedAt()
  }
}

export function switchUser(userName: string) {
  const name = userName.trim()
  const key = userKey(name)
  setCurrentUserKey(key)

  const profiles = loadUserProfiles()
  if (!profiles[key]) {
    profiles[key] = { ...defaultProfile(name), updatedAt: 0 }
    saveUserProfiles(profiles)
  }

  const localUi = loadLocalUiPrefs()
  if (!localUi.syncCode.trim()) {
    saveLocalUiPrefs({ syncCode: DEFAULT_SYNC_CODE })
  }
}

export function saveLoginProfile(userName: string) {
  switchUser(userName)
}

export { loadCustomCocktails, loadEdits, loadDeletedIds, loadNutritionOverrides, loadUserProfiles, saveCustomCocktails }

export function upsertNutritionEntry(entry: import('../types').IngredientNutrition) {
  const entries = loadNutritionOverrides()
  const idx = entries.findIndex((e) => e.id === entry.id)
  if (idx >= 0) entries[idx] = entry
  else entries.push(entry)
  saveNutritionOverrides(entries)
}

export function deleteNutritionEntry(id: string) {
  saveNutritionOverrides(loadNutritionOverrides().filter((e) => e.id !== id))
}

export function deleteCocktail(id: string, isCustom: boolean) {
  if (isCustom) {
    saveCustomCocktails(loadCustomCocktails().filter((c) => c.id !== id))
  } else {
    const deleted = new Set(loadDeletedIds())
    deleted.add(id)
    saveDeletedIds([...deleted])
  }

  const edits = loadEdits()
  if (edits[id]) {
    delete edits[id]
    saveEdits(edits)
  }

  const prefs = loadPrefs()
  savePrefs({
    ...prefs,
    favorites: prefs.favorites.filter((f) => f !== id),
    recentlyViewed: Object.fromEntries(
      Object.entries(prefs.recentlyViewed).filter(([cocktailId]) => cocktailId !== id),
    ),
    collections: prefs.collections.map((c) => ({
      ...c,
      cocktailIds: c.cocktailIds.filter((cid) => cid !== id),
    })),
  })
}

export function saveCocktailEdit(cocktail: import('../types').Cocktail) {
  if (cocktail.custom) {
    const custom = loadCustomCocktails()
    const idx = custom.findIndex((c) => c.id === cocktail.id)
    if (idx >= 0) {
      custom[idx] = cocktail
      saveCustomCocktails(custom)
    }
    return
  }
  const edits = loadEdits()
  edits[cocktail.id] = cocktail
  saveEdits(edits)
}

export function markRecentlyViewed(id: string) {
  const prefs = loadPrefs()
  savePrefs({
    ...prefs,
    recentlyViewed: { ...prefs.recentlyViewed, [id]: Date.now() },
    collapsedGroups: null,
  })
}

export function toggleFavorite(id: string): boolean {
  const prefs = loadPrefs()
  const set = new Set(prefs.favorites)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  savePrefs({ ...prefs, favorites: [...set] })
  return set.has(id)
}

export function createCollection(name: string): Collection {
  const prefs = loadPrefs()
  const collection: Collection = {
    id: `col-${Date.now()}`,
    name: name.trim(),
    cocktailIds: [],
  }
  savePrefs({ ...prefs, collections: [...prefs.collections, collection] })
  return collection
}

export function renameCollection(id: string, name: string) {
  const prefs = loadPrefs()
  savePrefs({
    ...prefs,
    collections: prefs.collections.map((c) =>
      c.id === id ? { ...c, name: name.trim() } : c,
    ),
  })
}

export function deleteCollection(id: string) {
  const prefs = loadPrefs()
  savePrefs({
    ...prefs,
    collections: prefs.collections.filter((c) => c.id !== id),
  })
}

export function addCocktailToCollection(collectionId: string, cocktailId: string) {
  const prefs = loadPrefs()
  savePrefs({
    ...prefs,
    collections: prefs.collections.map((c) => {
      if (c.id !== collectionId) return c
      if (c.cocktailIds.includes(cocktailId)) return c
      return { ...c, cocktailIds: [...c.cocktailIds, cocktailId] }
    }),
  })
}

export function removeCocktailFromCollection(collectionId: string, cocktailId: string) {
  const prefs = loadPrefs()
  savePrefs({
    ...prefs,
    collections: prefs.collections.map((c) =>
      c.id === collectionId
        ? { ...c, cocktailIds: c.cocktailIds.filter((id) => id !== cocktailId) }
        : c,
    ),
  })
}

export function loadCollections(): Collection[] {
  return loadPrefs().collections
}

export function exportSyncUserData(): {
  syncCode: string
  userProfiles: Record<string, UserProfile>
} {
  return {
    syncCode: loadLocalUiPrefs().syncCode,
    userProfiles: normalizeServerProfiles(loadUserProfiles()),
  }
}

export function importSyncUserData(
  syncCode: string,
  userProfiles: Record<string, UserProfile>,
  preserveCurrentUserKey = true,
) {
  const currentKey = preserveCurrentUserKey ? getCurrentUserKey() : ''
  saveUserProfiles(normalizeServerProfiles(userProfiles))
  if (currentKey) setCurrentUserKey(currentKey)
  if (syncCode) saveLocalUiPrefs({ syncCode })
}

export type { UserProfile, Theme, UnitSystem }
