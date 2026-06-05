import type { Cocktail, Ingredient } from '../types'

function formatIngredient(ingredient: Ingredient): string {
  const parts: string[] = []
  if (ingredient.amount != null) {
    parts.push(String(ingredient.amount))
    if (ingredient.unit) parts.push(ingredient.unit)
  }
  parts.push(ingredient.name)
  return parts.join(' ')
}

function formatCocktail(cocktail: Cocktail): string {
  const lines = [
    `### ${cocktail.name}`,
    `Spirits: ${cocktail.spirits.join(', ')}`,
    `${cocktail.method} · ${cocktail.glass} · ${cocktail.ice === 'None' ? 'no ice' : cocktail.ice}`,
    `Ingredients: ${cocktail.ingredients.map(formatIngredient).join('; ')}`,
    `Instructions: ${cocktail.instructions.map((step, index) => `${index + 1}. ${step}`).join(' ')}`,
  ]
  if (cocktail.garnish) lines.push(`Garnish: ${cocktail.garnish}`)
  return lines.join('\n')
}

export function formatRecipesForAi(cocktails: Cocktail[]): string {
  const sorted = [...cocktails].sort((a, b) => a.name.localeCompare(b.name))
  const body = sorted.map(formatCocktail).join('\n\n')
  return `# Recipe collection (${sorted.length} recipes)\n\n${body}`
}

export const AI_RECIPES_SYSTEM_PROMPT =
  'You are a helpful cocktail assistant. The user has a personal recipe collection in their app. When recipe context is provided, answer questions about those specific recipes, compare them, suggest variations, and help with substitutions. Prefer the provided recipes over general knowledge when they are relevant.'

export function buildRecipesSystemMessage(recipesContext: string): string {
  return `${AI_RECIPES_SYSTEM_PROMPT}\n\n${recipesContext}`
}
