import type { AppPreferences, Cocktail, IngredientNutrition } from '../types'

const PREFS_KEY = 'cocktail-favorites:prefs'
const CUSTOM_KEY = 'cocktail-favorites:custom'
const EDITS_KEY = 'cocktail-favorites:edits'
const DELETED_KEY = 'cocktail-favorites:deleted'
const NUTRITION_KEY = 'cocktail-favorites:nutrition'
const LEGACY_COLLAPSED_GROUPS_KEY = 'cocktail-favorites:collapsed-groups'

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

const defaultPrefs: AppPreferences = {
  favorites: [],
  recentlyViewed: {},
  unit: 'oz',
  multiplier: 1,
  theme: 'dark',
  fontSize: 'md',
  collapsedGroups: null,
  userName: '',
  syncCode: '',
  syncUpdatedAt: 0,
  lastSyncedAt: null,
  listView: 'list',
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

export function loadPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...defaultPrefs }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    const legacyCollapsed = parsed.collapsedGroups === undefined ? migrateLegacyCollapsedGroups() : null
    return {
      ...defaultPrefs,
      ...parsed,
      collapsedGroups: parsed.collapsedGroups ?? legacyCollapsed,
    }
  } catch {
    return { ...defaultPrefs }
  }
}

export function savePrefs(prefs: AppPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  triggerPrefsSync()
}

const DEFAULT_SYNC_CODE = 'arnon'

/** Save display name on login; set default sync code on first use. */
export function saveLoginProfile(userName: string) {
  const prefs = loadPrefs()
  prefs.userName = userName.trim()
  if (!prefs.syncCode.trim()) {
    prefs.syncCode = DEFAULT_SYNC_CODE
  }
  savePrefs(prefs)
}

function bumpSyncTimestamp() {
  const prefs = loadPrefs()
  prefs.syncUpdatedAt = Date.now()
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function loadCustomCocktails(): Cocktail[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Cocktail[]
  } catch {
    return []
  }
}

export function saveCustomCocktails(cocktails: Cocktail[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(cocktails))
  bumpSyncTimestamp()
  triggerRecipeSync()
}

export function loadEdits(): Record<string, Cocktail> {
  try {
    const raw = localStorage.getItem(EDITS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Cocktail>
  } catch {
    return {}
  }
}

export function saveEdits(edits: Record<string, Cocktail>) {
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

export function loadNutritionOverrides(): IngredientNutrition[] {
  try {
    const raw = localStorage.getItem(NUTRITION_KEY)
    if (!raw) return []
    return JSON.parse(raw) as IngredientNutrition[]
  } catch {
    return []
  }
}

export function saveNutritionOverrides(entries: IngredientNutrition[]) {
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(entries))
  triggerNutritionSync()
}

export function upsertNutritionEntry(entry: IngredientNutrition) {
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
  savePrefs(prefs)
}

export function saveCocktailEdit(cocktail: Cocktail) {
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
  prefs.syncUpdatedAt = Date.now()
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  void import('./sync').then((m) => m.syncAfterPrefsChange())
  return set.has(id)
}
