import type { Cocktail } from '../types'
import { SPIRIT_COLORS } from '../types'

export function cocktailInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function primarySpirit(cocktail: Cocktail): string {
  return cocktail.spirits[0] ?? 'Other'
}

export function spiritGradient(cocktail: Cocktail): string {
  return SPIRIT_COLORS[primarySpirit(cocktail)] ?? SPIRIT_COLORS.Other
}

export function subtitle(cocktail: Cocktail): string {
  const ice = cocktail.ice === 'None' ? 'no ice' : cocktail.ice.toLowerCase()
  return `${cocktail.method} · ${cocktail.glass} · ${ice}`
}
