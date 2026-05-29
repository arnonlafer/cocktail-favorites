import type { AppPreferences, Cocktail } from '../types'

const PREFS_KEY = 'cocktail-favorites:prefs'
const CUSTOM_KEY = 'cocktail-favorites:custom'
const EDITS_KEY = 'cocktail-favorites:edits'
const COLLAPSED_GROUPS_KEY = 'cocktail-favorites:collapsed-groups'

const defaultPrefs: AppPreferences = {
  favorites: [],
  recentlyViewed: {},
  unit: 'oz',
  multiplier: 1,
}

export function loadPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...defaultPrefs }
    return { ...defaultPrefs, ...JSON.parse(raw) }
  } catch {
    return { ...defaultPrefs }
  }
}

export function savePrefs(prefs: AppPreferences) {
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

export function loadCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_GROUPS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function saveCollapsedGroups(collapsed: Set<string>) {
  localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...collapsed]))
}
