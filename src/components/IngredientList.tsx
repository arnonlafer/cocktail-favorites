import type { Ingredient, UnitSystem } from '../types'
import { formatIngredientParts } from '../lib/units'

interface Props {
  ingredients: Ingredient[]
  unit: UnitSystem
  multiplier: number
}

export function IngredientList({ ingredients, unit, multiplier }: Props) {
  return (
    <ul className="divide-y divide-white/6 rounded-2xl border border-white/8 bg-bar-900/60">
      {ingredients.map((ing, i) => {
        const { amount, name } = formatIngredientParts(ing, unit, multiplier)
        return (
          <li key={i} className="flex items-baseline gap-4 px-4 py-3">
            <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-amber-light">
              {amount}
            </span>
            <span className="flex-1 text-sm leading-snug text-white/90">{name}</span>
          </li>
        )
      })}
    </ul>
  )
}
