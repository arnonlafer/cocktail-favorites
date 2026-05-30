import type { Ingredient, UnitSystem } from '../types'

const OZ_TO_ML = 29.5735

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
