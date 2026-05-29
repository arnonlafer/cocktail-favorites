import type { Cocktail } from '../types'
import { SPIRIT_ORDER } from '../types'
import type { AppPreferences } from '../types'

export function getMostRecentCocktailId(recentlyViewed: Record<string, number>): string | null {
  const entries = Object.entries(recentlyViewed)
  if (!entries.length) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

export function computeCollapsedGroups(
  prefs: AppPreferences,
  cocktails: Cocktail[],
  visibleSpirits: string[],
): Set<string> {
  if (prefs.collapsedGroups !== null) {
    return new Set(prefs.collapsedGroups)
  }

  const lastId = getMostRecentCocktailId(prefs.recentlyViewed)
  const lastCocktail = lastId ? cocktails.find((c) => c.id === lastId) : undefined
  const expanded = new Set(lastCocktail?.spirits ?? [])

  return new Set(visibleSpirits.filter((spirit) => !expanded.has(spirit)))
}

export function allVisibleSpirits(cocktails: Cocktail[]): string[] {
  return SPIRIT_ORDER.filter((spirit) => cocktails.some((c) => c.spirits.includes(spirit)))
}
