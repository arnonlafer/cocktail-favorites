import { DEFAULT_CART_SEARCH_URL } from './cart'
import { normalizeStockCategory } from './stock'
import type {
  AppPreferences,
  Collection,
  Theme,
  UnitSystem,
  UserProfile,
} from '../types'

const PREFS_KEY = 'cocktail-favorites:prefs'
const CUSTOM_KEY = 'cocktail-favorites:custom'
const EDITS_KEY = 'cocktail-favorites:edits'
const DELETED_KEY = 'cocktail-favorites:deleted'
const NUTRITION_KEY = 'cocktail-favorites:nutrition'
const USER_PROFILES_KEY = 'cocktail-favorites:user-profiles'
const CURRENT_USER_KEY = 'cocktail-favorites:current-user'
const SHARED_KEY = 'cocktail-favorites:shared'
const LEGACY_COLLAPSED_GROUPS_KEY = 'cocktail-favorites:collapsed-groups'

export const DEFAULT_SYNC_CODE = 'arnon'

let syncSuppressed = false

function triggerRecipeSync() {
  if (syncSuppressed) return
  void import('./sync').then((m) => m.syncAfterRecipeChange())
}

function triggerPrefsSync() {
  if (syncSuppressed) return
  void import('./sync').then((m) => m.scheduleSyncPush())
}

function triggerNutritionSync() {
  if (syncSuppressed) return
  bumpSyncTimestamp()
  void import('./sync').then((m) => m.syncAfterNutritionChange())
}

export function runWithoutSync(fn: () => void) {
  syncSuppressed = true
  try {
    fn()
  } finally {
    syncSuppressed = false
  }
}

export function userKey(userName: string): string {
  return userName.trim().toLowerCase().replace(/\s+/g, '-')
}

interface SharedSettings {
  syncCode: string
  syncUpdatedAt: number
  lastSyncedAt: number | null
}

const defaultShared: SharedSettings = {
  syncCode: '',
  syncUpdatedAt: 0,
  lastSyncedAt: null,
}

function defaultProfile(userName: string): UserProfile {
  return {
    userName: userName.trim(),
    favorites: [],
    recentlyViewed: {},
    unit: 'oz',
    multiplier: 1,
    theme: 'dark',
    fontSize: 'md',
    collapsedGroups: null,
    listView: 'list',
    collections: [],
    recipeDraft: '',
    cart: [],
    stock: [],
    lastStockCategory: 'whiskey',
    cartSearchUrl: DEFAULT_CART_SEARCH_URL,
    randomFavoritesOnly: true,
    homeGroupView: 'spirits',
    cocktailSort: 'recent',
    updatedAt: Date.now(),
  }
}

export function getCurrentUserKey(): string {
  return localStorage.getItem(CURRENT_USER_KEY) ?? ''
}

export function setCurrentUserKey(key: string) {
  if (key) localStorage.setItem(CURRENT_USER_KEY, key)
  else localStorage.removeItem(CURRENT_USER_KEY)
}

export function loadUserProfiles(): Record<string, UserProfile> {
  try {
    const raw = localStorage.getItem(USER_PROFILES_KEY)
    if (raw) return JSON.parse(raw) as Record<string, UserProfile>
  } catch {
    /* fall through to migration */
  }
  return migrateLegacyPrefs()
}

function migrateLegacyCollapsedGroups(): string[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_COLLAPSED_GROUPS_KEY)
    if (!raw) return null
    localStorage.removeItem(LEGACY_COLLAPSED_GROUPS_KEY)
    return JSON.parse(raw) as string[]
  } catch {
    return null
  }
}

function migrateLegacyPrefs(): Record<string, UserProfile> {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    const legacyCollapsed = parsed.collapsedGroups === undefined ? migrateLegacyCollapsedGroups() : null
    const name = parsed.userName?.trim() || 'Guest'
    const key = userKey(name)

    const profile: UserProfile = {
      userName: name,
      favorites: parsed.favorites ?? [],
      recentlyViewed: parsed.recentlyViewed ?? {},
      unit: parsed.unit ?? 'oz',
      multiplier: parsed.multiplier ?? 1,
      theme: parsed.theme ?? 'dark',
      fontSize: parsed.fontSize ?? 'md',
      collapsedGroups: parsed.collapsedGroups ?? legacyCollapsed,
      listView: parsed.listView ?? 'list',
      collections: parsed.collections ?? [],
      recipeDraft: '',
      cart: [],
      stock: [],
      lastStockCategory: 'whiskey',
      cartSearchUrl: DEFAULT_CART_SEARCH_URL,
      randomFavoritesOnly: true,
      homeGroupView: 'spirits',
      cocktailSort: 'recent',
      updatedAt: parsed.syncUpdatedAt ?? Date.now(),
    }

    const profiles = { [key]: profile }
    localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles))
    setCurrentUserKey(key)

    const shared: SharedSettings = {
      syncCode: parsed.syncCode ?? '',
      syncUpdatedAt: parsed.syncUpdatedAt ?? 0,
      lastSyncedAt: parsed.lastSyncedAt ?? null,
    }
    localStorage.setItem(SHARED_KEY, JSON.stringify(shared))
    localStorage.removeItem(PREFS_KEY)

    return profiles
  } catch {
    return {}
  }
}

export function saveUserProfiles(profiles: Record<string, UserProfile>) {
  localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles))
}

export function loadSharedSettings(): SharedSettings {
  try {
    const raw = localStorage.getItem(SHARED_KEY)
    if (raw) return { ...defaultShared, ...(JSON.parse(raw) as Partial<SharedSettings>) }
  } catch {
    /* ignore */
  }

  const profiles = loadUserProfiles()
  if (Object.keys(profiles).length === 0) return { ...defaultShared }

  return { ...defaultShared }
}

export function saveSharedSettings(shared: SharedSettings) {
  localStorage.setItem(SHARED_KEY, JSON.stringify(shared))
}

function profileToPrefs(profile: UserProfile, shared: SharedSettings): AppPreferences {
  return {
    userName: profile.userName,
    favorites: profile.favorites,
    recentlyViewed: profile.recentlyViewed,
    unit: profile.unit,
    multiplier: profile.multiplier,
    theme: profile.theme === 'dim' || profile.theme === 'light' ? profile.theme : 'dark',
    fontSize: profile.fontSize,
    collapsedGroups: profile.collapsedGroups,
    listView: profile.listView,
    collections: profile.collections,
    recipeDraft: profile.recipeDraft ?? '',
    cart: profile.cart ?? [],
    stock: profile.stock ?? [],
    lastStockCategory: normalizeStockCategory(profile.lastStockCategory),
    cartSearchUrl: profile.cartSearchUrl?.trim() || DEFAULT_CART_SEARCH_URL,
    randomFavoritesOnly: profile.randomFavoritesOnly ?? true,
    homeGroupView: profile.homeGroupView ?? 'spirits',
    cocktailSort: profile.cocktailSort ?? 'recent',
    syncCode: shared.syncCode,
    syncUpdatedAt: shared.syncUpdatedAt,
    lastSyncedAt: shared.lastSyncedAt,
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
  return profileToPrefs(getCurrentProfile(), loadSharedSettings())
}

export function savePrefs(prefs: AppPreferences) {
  const key = getCurrentUserKey() || userKey(prefs.userName || 'Guest')
  if (!getCurrentUserKey()) setCurrentUserKey(key)

  const profiles = loadUserProfiles()
  profiles[key] = {
    userName: prefs.userName,
    favorites: prefs.favorites,
    recentlyViewed: prefs.recentlyViewed,
    unit: prefs.unit,
    multiplier: prefs.multiplier,
    theme: prefs.theme,
    fontSize: prefs.fontSize,
    collapsedGroups: prefs.collapsedGroups,
    listView: prefs.listView,
    collections: prefs.collections ?? [],
    recipeDraft: prefs.recipeDraft ?? '',
    cart: prefs.cart ?? [],
    stock: prefs.stock ?? [],
    lastStockCategory: normalizeStockCategory(prefs.lastStockCategory),
    cartSearchUrl: prefs.cartSearchUrl?.trim() || DEFAULT_CART_SEARCH_URL,
    randomFavoritesOnly: prefs.randomFavoritesOnly ?? true,
    homeGroupView: prefs.homeGroupView ?? 'spirits',
    cocktailSort: prefs.cocktailSort ?? 'recent',
    updatedAt: Date.now(),
  }
  saveUserProfiles(profiles)

  const shared = loadSharedSettings()
  shared.syncCode = prefs.syncCode
  shared.syncUpdatedAt = prefs.syncUpdatedAt
  shared.lastSyncedAt = prefs.lastSyncedAt
  saveSharedSettings(shared)

  triggerPrefsSync()
}

function bumpSyncTimestamp() {
  const shared = loadSharedSettings()
  shared.syncUpdatedAt = Date.now()
  saveSharedSettings(shared)
}

/** Switch to a user profile on login; set default sync code on first household use. */
export function switchUser(userName: string) {
  const name = userName.trim()
  const key = userKey(name)
  setCurrentUserKey(key)

  const profiles = loadUserProfiles()
  if (!profiles[key]) {
    profiles[key] = defaultProfile(name)
    saveUserProfiles(profiles)
  }

  const shared = loadSharedSettings()
  if (!shared.syncCode.trim()) {
    shared.syncCode = DEFAULT_SYNC_CODE
    saveSharedSettings(shared)
  }
}

export function saveLoginProfile(userName: string) {
  switchUser(userName)
}

export function loadCustomCocktails(): import('../types').Cocktail[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    return JSON.parse(raw) as import('../types').Cocktail[]
  } catch {
    return []
  }
}

export function saveCustomCocktails(cocktails: import('../types').Cocktail[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(cocktails))
  bumpSyncTimestamp()
  triggerRecipeSync()
}

export function loadEdits(): Record<string, import('../types').Cocktail> {
  try {
    const raw = localStorage.getItem(EDITS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, import('../types').Cocktail>
  } catch {
    return {}
  }
}

export function saveEdits(edits: Record<string, import('../types').Cocktail>) {
  localStorage.setItem(EDITS_KEY, JSON.stringify(edits))
  bumpSyncTimestamp()
  triggerRecipeSync()
}

export function loadDeletedIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function saveDeletedIds(ids: string[]) {
  localStorage.setItem(DELETED_KEY, JSON.stringify(ids))
  bumpSyncTimestamp()
  triggerRecipeSync()
}

export function loadNutritionOverrides(): import('../types').IngredientNutrition[] {
  try {
    const raw = localStorage.getItem(NUTRITION_KEY)
    if (!raw) return []
    return JSON.parse(raw) as import('../types').IngredientNutrition[]
  } catch {
    return []
  }
}

export function saveNutritionOverrides(entries: import('../types').IngredientNutrition[]) {
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(entries))
  triggerNutritionSync()
}

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
  prefs.favorites = prefs.favorites.filter((f) => f !== id)
  delete prefs.recentlyViewed[id]
  prefs.collections = prefs.collections.map((c) => ({
    ...c,
    cocktailIds: c.cocktailIds.filter((cid) => cid !== id),
  }))
  savePrefs(prefs)
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
  prefs.recentlyViewed[id] = Date.now()
  prefs.collapsedGroups = null
  savePrefs(prefs)
}

export function toggleFavorite(id: string): boolean {
  const prefs = loadPrefs()
  const set = new Set(prefs.favorites)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  prefs.favorites = [...set]
  savePrefs(prefs)
  void import('./sync').then((m) => m.syncAfterPrefsChange())
  return set.has(id)
}

export function createCollection(name: string): Collection {
  const prefs = loadPrefs()
  const collection: Collection = {
    id: `col-${Date.now()}`,
    name: name.trim(),
    cocktailIds: [],
  }
  prefs.collections = [...prefs.collections, collection]
  savePrefs(prefs)
  return collection
}

export function renameCollection(id: string, name: string) {
  const prefs = loadPrefs()
  prefs.collections = prefs.collections.map((c) =>
    c.id === id ? { ...c, name: name.trim() } : c,
  )
  savePrefs(prefs)
}

export function deleteCollection(id: string) {
  const prefs = loadPrefs()
  prefs.collections = prefs.collections.filter((c) => c.id !== id)
  savePrefs(prefs)
}

export function addCocktailToCollection(collectionId: string, cocktailId: string) {
  const prefs = loadPrefs()
  prefs.collections = prefs.collections.map((c) => {
    if (c.id !== collectionId) return c
    if (c.cocktailIds.includes(cocktailId)) return c
    return { ...c, cocktailIds: [...c.cocktailIds, cocktailId] }
  })
  savePrefs(prefs)
}

export function removeCocktailFromCollection(collectionId: string, cocktailId: string) {
  const prefs = loadPrefs()
  prefs.collections = prefs.collections.map((c) =>
    c.id === collectionId
      ? { ...c, cocktailIds: c.cocktailIds.filter((id) => id !== cocktailId) }
      : c,
  )
  savePrefs(prefs)
}

export function loadCollections(): Collection[] {
  return loadPrefs().collections
}

/** Used by sync to read/write all user data. */
export function exportSyncUserData(): {
  syncCode: string
  userProfiles: Record<string, UserProfile>
} {
  return {
    syncCode: loadSharedSettings().syncCode,
    userProfiles: loadUserProfiles(),
  }
}

export function importSyncUserData(
  syncCode: string,
  userProfiles: Record<string, UserProfile>,
  preserveCurrentUserKey = true,
) {
  const currentKey = preserveCurrentUserKey ? getCurrentUserKey() : ''
  saveUserProfiles(userProfiles)
  if (currentKey) setCurrentUserKey(currentKey)

  const shared = loadSharedSettings()
  shared.syncCode = syncCode || shared.syncCode
  saveSharedSettings(shared)
}

export type { SharedSettings, UserProfile, Theme, UnitSystem }
