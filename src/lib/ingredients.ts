import type { Cocktail, Ingredient } from '../types'
import { sortIngredients } from './ingredientOrder'

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 0.33,
  '⅔': 0.67,
}

function parseFractionToken(token: string): number | null {
  const t = token.trim()
  if (UNICODE_FRACTIONS[t] != null) return UNICODE_FRACTIONS[t]

  const mixed = t.match(/^(\d+)\s+(\d+\/\d+)$/)
  if (mixed) {
    const [, whole, frac] = mixed
    const [num, den] = frac.split('/').map(Number)
    if (den) return Number(whole) + num / den
  }

  const simple = t.match(/^(\d+)\/(\d+)$/)
  if (simple) {
    const num = Number(simple[1])
    const den = Number(simple[2])
    if (den) return num / den
  }

  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function normalizeUnit(raw: string | undefined): string | null {
  if (!raw) return 'oz'
  const u = raw.toLowerCase().replace(/\./g, '').trim()
  if (u === 'oz' || u === 'ounce' || u === 'ounces' || u === 'floz') return 'oz'
  if (u === 'ml') return 'ml'
  if (u === 'dash' || u === 'dashes') return 'dash'
  if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') return 'tsp'
  if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') return 'tbsp'
  if (u === 'fl') return 'fl'
  return u
}

/** Parse "½ Oz Bourbon" or "¾ Oz Sweet Vermouth" embedded in the name field. */
function parseMeasureFromName(name: string): Ingredient | null {
  const trimmed = name.trim()

  const pattern =
    /^([½¼¾⅓⅔]|\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(?:oz|ounces?|ml|dash(?:es)?|tsp|teaspoons?|tbsp|tablespoons?|fl\.?\s*oz)?\.?\s+(.+)$/i

  const match = trimmed.match(pattern)
  if (!match) return null

  const amount = parseFractionToken(match[1]!)
  if (amount == null) return null

  const unitMatch = trimmed.match(
    /^[½¼¾⅓⅔\d./\s]+?\s*(oz|ounces?|ml|dash(?:es)?|tsp|teaspoons?|tbsp|tablespoons?|fl\.?\s*oz)/i,
  )
  const unit = normalizeUnit(unitMatch?.[1])
  const ingredientName = match[2]!.trim()

  if (!ingredientName) return null

  return { amount, unit, name: ingredientName }
}

export function normalizeIngredient(ingredient: Ingredient): Ingredient {
  const { amount, unit, name } = ingredient

  if (amount != null && unit) {
    return { amount, unit: normalizeUnit(unit) ?? unit, name: name.trim() }
  }

  const fromName = parseMeasureFromName(name)
  if (fromName) return fromName

  if (amount != null && !unit) {
    const reparsed = parseMeasureFromName(name)
    if (reparsed) return reparsed
  }

  return { amount, unit, name: name.trim() }
}

export function normalizeCocktail(cocktail: Cocktail): Cocktail {
  return {
    ...cocktail,
    ingredients: sortIngredients({
      spirits: cocktail.spirits,
      ingredients: cocktail.ingredients.map(normalizeIngredient),
    }),
  }
}
