import type { Ingredient, UnitSystem } from '../types'

const OZ_TO_ML = 29.5735

const VOLUME_UNITS = new Set(['oz', 'ounce', 'ounces', 'ml', 'fl'])

export function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) return String(Math.round(rounded))
  const whole = Math.floor(rounded)
  const frac = rounded - whole
  const common: Record<string, string> = {
    '0.25': '¼',
    '0.33': '⅓',
    '0.5': '½',
    '0.67': '⅔',
    '0.75': '¾',
  }
  const symbol = common[Number(frac.toFixed(2)).toString()] ?? common[frac.toFixed(2)]
  if (whole === 0 && symbol) return symbol
  if (symbol) return `${whole}${symbol}`
  return String(rounded)
}

export interface FormattedIngredient {
  amount: string
  name: string
}

export function formatIngredientParts(
  ingredient: Ingredient,
  unit: UnitSystem,
  multiplier: number,
): FormattedIngredient {
  const { amount, unit: ingUnit, name } = ingredient

  if (amount == null || !ingUnit) {
    return { amount: '—', name }
  }

  if (VOLUME_UNITS.has(ingUnit)) {
    let ozAmount = amount
    if (ingUnit === 'ml') ozAmount = amount / OZ_TO_ML
    const scaledOz = ozAmount * multiplier
    const display = unit === 'oz' ? scaledOz : scaledOz * OZ_TO_ML
    return { amount: formatAmount(display), name }
  }

  const scaled = amount * multiplier
  const amountText = Number.isInteger(scaled) ? String(scaled) : formatAmount(scaled)
  const unitLabel = ingUnit === 'dash' || ingUnit === 'dashes' ? 'dash' : ingUnit
  return { amount: `${amountText} ${unitLabel}`, name }
}
