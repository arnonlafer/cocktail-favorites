import type { Cocktail } from '../types'

function normalizeIngredient(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function similarityScore(a: Cocktail, b: Cocktail): number {
  if (a.id === b.id) return -1

  let score = 0
  for (const spirit of a.spirits) {
    if (b.spirits.includes(spirit)) score += 3
  }
  if (a.method === b.method) score += 1
  if (a.glass === b.glass) score += 1

  const aNames = a.ingredients.map((i) => normalizeIngredient(i.name))
  for (const ing of b.ingredients) {
    const name = normalizeIngredient(ing.name)
    if (aNames.some((an) => an === name || an.includes(name) || name.includes(an))) score += 2
  }

  return score
}

export function rankSimilarCocktails(cocktail: Cocktail, all: Cocktail[], limit = 12): Cocktail[] {
  return all
    .filter((c) => c.id !== cocktail.id)
    .map((c) => ({ c, score: similarityScore(cocktail, c) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ c }) => c)
}

export function resolveSimilarCocktails(
  cocktail: Cocktail,
  all: Cocktail[],
  limit = 6,
): Cocktail[] {
  const byId = new Map(all.map((c) => [c.id, c]))
  if (cocktail.similarIds?.length) {
    const picked = cocktail.similarIds
      .map((id) => byId.get(id))
      .filter((c): c is Cocktail => !!c && c.id !== cocktail.id)
    if (picked.length) return picked.slice(0, limit)
  }
  return rankSimilarCocktails(cocktail, all, limit)
}
