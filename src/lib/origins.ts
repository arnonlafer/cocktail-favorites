import originsData from '../data/cocktail-origins.json'
import type { Cocktail, CocktailClassification, CocktailOrigin } from '../types'

const defaults = originsData as Record<string, CocktailOrigin>

const CLASSIFICATION_LABEL: Record<CocktailClassification, string> = {
  classic: 'Classic',
  'modern-classic': 'Modern classic',
  contemporary: 'Contemporary',
}

export const ORIGIN_CLASSIFICATION_OPTIONS: { value: CocktailClassification; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern-classic', label: 'Modern classic' },
  { value: 'contemporary', label: 'Contemporary' },
]

export function getDefaultOrigin(id: string): CocktailOrigin | null {
  return defaults[id] ?? null
}

export function getCocktailOrigin(cocktail: Pick<Cocktail, 'id' | 'origin'>): CocktailOrigin | null {
  return cocktail.origin ?? defaults[cocktail.id] ?? null
}

export function formatCocktailOrigin(origin: CocktailOrigin): string {
  const parts = [CLASSIFICATION_LABEL[origin.classification]]
  if (origin.year) parts.push(origin.year)
  if (origin.creator) parts.push(origin.creator)
  return parts.join(' · ')
}
