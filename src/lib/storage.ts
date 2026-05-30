import type { AppPreferences, Cocktail } from '../types'
import { scheduleSyncPush } from './sync'

const PREFS_KEY = 'cocktail-favorites:prefs'
const CUSTOM_KEY = 'cocktail-favorites:custom'
const EDITS_KEY = 'cocktail-favorites:edits'
const LEGACY_COLLAPSED_GROUPS_KEY = 'cocktail-favorites:collapsed-groups'

const defaultPrefs: AppPreferences = {
  favorites: [],
  recentlyViewed: {},
  unit: 'oz',
  multiplier: 1,
  theme: 'dark',
  fontSize: 'md',
  collapsedGroups: null,
  syncCode: '',
  syncUpdatedAt: 0,
  lastSyncedAt: null,
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
  scheduleSyncPush()
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
  scheduleSyncPush()
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
  scheduleSyncPush()
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
  savePrefs(prefs)
  return set.has(id)
}
