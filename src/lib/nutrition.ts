import baseNutrition from '../data/ingredient-nutrition.json'
import type { Cocktail, Ingredient, IngredientNutrition } from '../types'
import { normalizeIngredient } from './ingredients'
import { loadNutritionOverrides } from './storage'

const OZ_TO_ML = 29.5735
const DASH_OZ = 0.025
const TABLESPOON_OZ = 0.5
const TEASPOON_OZ = 0.167

const VOLUME_UNITS = new Set(['oz', 'ounce', 'ounces', 'ml', 'fl'])

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildLookup(entries: IngredientNutrition[]): Map<string, IngredientNutrition> {
  const map = new Map<string, IngredientNutrition>()
  for (const entry of entries) {
    map.set(normalizeName(entry.name), entry)
    for (const alias of entry.aliases ?? []) {
      map.set(normalizeName(alias), entry)
    }
  }
  return map
}

export function getAllNutritionEntries(): IngredientNutrition[] {
  const overrides = loadNutritionOverrides()
  const byId = new Map<string, IngredientNutrition>()

  for (const entry of baseNutrition as IngredientNutrition[]) {
    byId.set(entry.id, { ...entry })
  }
  for (const entry of overrides) {
    byId.set(entry.id, { ...entry })
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function lookupNutrition(ingredientName: string): IngredientNutrition | null {
  const entries = getAllNutritionEntries()
  const lookup = buildLookup(entries)
  const normalized = normalizeName(ingredientName)

  const exact = lookup.get(normalized)
  if (exact) return exact

  // Prefer the longest fuzzy key so "water" does not match "watermelon juice"
  // and short tokens like "ice" do not match inside "juice".
  let bestKey = ''
  let best: IngredientNutrition | null = null
  for (const [key, entry] of lookup) {
    if (!key) continue
    const ingredientContainsKey = normalized.includes(key)
    const keyContainsIngredient = key.includes(normalized) && normalized.length >= 4
    if (!ingredientContainsKey && !keyContainsIngredient) continue
    if (ingredientContainsKey && key.length <= 3) {
      const asWord = new RegExp(`(?:^| )${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$| )`)
      if (!asWord.test(normalized)) continue
    }
    if (key.length > bestKey.length) {
      bestKey = key
      best = entry
    }
  }
  return best
}

function amountToOz(amount: number, unit: string): number | null {
  if (VOLUME_UNITS.has(unit)) {
    if (unit === 'ml') return amount / OZ_TO_ML
    return amount
  }
  if (unit === 'dash' || unit === 'dashes') return amount * DASH_OZ
  if (unit === 'tablespoon' || unit === 'tbsp') return amount * TABLESPOON_OZ
  if (unit === 'teaspoon' || unit === 'tsp') return amount * TEASPOON_OZ
  if (unit === 'cup' || unit === 'cups') return amount * 8
  if (unit === 'pc') return amount
  return null
}

export interface CocktailNutrition {
  calories: number
  carbs: number
  matched: number
  total: number
  unknown: string[]
}

export function calculateCocktailNutrition(
  cocktail: Cocktail,
  multiplier = 1,
): CocktailNutrition {
  let calories = 0
  let carbs = 0
  let matched = 0
  const unknown: string[] = []

  for (const ingredient of cocktail.ingredients) {
    const result = calculateIngredientNutrition(ingredient, multiplier)
    if (result) {
      calories += result.calories
      carbs += result.carbs
      matched++
    } else if (ingredient.amount != null && ingredient.unit) {
      unknown.push(ingredient.name)
    }
  }

  return {
    calories: Math.round(calories),
    carbs: Math.round(carbs * 10) / 10,
    matched,
    total: cocktail.ingredients.length,
    unknown: [...new Set(unknown)],
  }
}

function calculateIngredientNutrition(
  ingredient: Ingredient,
  multiplier: number,
): { calories: number; carbs: number } | null {
  const normalized = normalizeIngredient(ingredient)
  const { amount, unit, name } = normalized
  if (amount == null || !unit) return null

  const nutrition = lookupNutrition(name)
  if (!nutrition) return null

  const oz = amountToOz(amount, unit)
  if (oz == null) return null

  const scaledOz = oz * multiplier
  return {
    calories: nutrition.caloriesPerOz * scaledOz,
    carbs: nutrition.carbsPerOz * scaledOz,
  }
}

export function formatNutritionSummary(nutrition: CocktailNutrition): string {
  const parts = [`${nutrition.calories} cal`, `${nutrition.carbs}g carbs`]
  if (nutrition.unknown.length > 0) {
    parts.push(`${nutrition.unknown.length} unknown`)
  }
  return parts.join(' · ')
}
