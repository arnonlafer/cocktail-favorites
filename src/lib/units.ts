import type { Ingredient, UnitSystem } from '../types'

/** Bar-standard conversion (1 oz = 30 ml), rounded for display. */
const BAR_OZ_TO_ML = 30

const VOLUME_UNITS = new Set(['oz', 'ounce', 'ounces', 'ml', 'fl'])

const COMMON_FRACTIONS: [number, string][] = [
  [0.75, '3/4'],
  [0.67, '2/3'],
  [0.5, '1/2'],
  [0.33, '1/3'],
  [0.25, '1/4'],
]

function formatFractionPart(frac: number): string | null {
  for (const [value, label] of COMMON_FRACTIONS) {
    if (Math.abs(frac - value) < 0.02) return label
  }
  return null
}

export function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) return String(Math.round(rounded))

  const whole = Math.floor(rounded)
  const frac = rounded - whole
  const fracLabel = formatFractionPart(frac)

  if (fracLabel) {
    if (whole === 0) return fracLabel
    return `${whole} ${fracLabel}`
  }

  return String(Number(rounded.toFixed(2)))
}

function roundBarMl(ml: number): number {
  return Math.round(ml * 2) / 2
}

function formatMl(value: number): string {
  const rounded = roundBarMl(value)
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(1).replace(/\.0$/, '')
}

export interface FormattedIngredient {
  amount: string
  unit: string | null
  name: string
}

function shortUnitLabel(unit: string): string {
  if (unit === 'dash' || unit === 'dashes') return 'dash'
  if (unit === 'tsp' || unit === 'teaspoon' || unit === 'teaspoons') return 'tsp'
  if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons') return 'tbsp'
  if (unit === 'oz' || unit === 'ounce' || unit === 'ounces' || unit === 'fl') return 'oz'
  if (unit === 'ml') return 'ml'
  if (unit === 'cup' || unit === 'cups') return 'cup'
  return unit
}

export function formatIngredientParts(
  ingredient: Ingredient,
  unit: UnitSystem,
  multiplier: number,
): FormattedIngredient {
  const { amount, unit: ingUnit, name } = ingredient

  if (amount == null) {
    return { amount: '—', unit: null, name }
  }

  if (!ingUnit || ingUnit === 'pc') {
    const scaled = amount * multiplier
    const amountText = Number.isInteger(scaled) ? String(scaled) : formatAmount(scaled)
    return { amount: amountText, unit: null, name }
  }

  if (VOLUME_UNITS.has(ingUnit)) {
    let ozAmount = amount
    if (ingUnit === 'ml') ozAmount = amount / BAR_OZ_TO_ML
    const scaledOz = ozAmount * multiplier
    if (unit === 'oz') {
      return { amount: formatAmount(scaledOz), unit: 'oz', name }
    }
    return { amount: formatMl(scaledOz * BAR_OZ_TO_ML), unit: 'ml', name }
  }

  const scaled = amount * multiplier
  const amountText = Number.isInteger(scaled) ? String(scaled) : formatAmount(scaled)
  return { amount: amountText, unit: shortUnitLabel(ingUnit), name }
}
