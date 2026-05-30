import type { Ingredient, UnitSystem } from '../types'
import { formatIngredientParts } from '../lib/units'

interface Props {
  ingredients: Ingredient[]
  unit: UnitSystem
  multiplier: number
}

export function IngredientList({ ingredients, unit, multiplier }: Props) {
  return (
    <ul className="divide-app divide-y rounded-2xl border border-app bg-bar-900/60">
      {ingredients.map((ing, i) => {
        const { amount, name } = formatIngredientParts(ing, unit, multiplier)
        return (
          <li key={i} className="flex items-baseline gap-3 px-4 py-3">
            <span className="w-16 shrink-0 text-right text-base font-semibold tabular-nums text-amber-light">
              {amount}
            </span>
            <span className="flex-1 text-base leading-snug text-foreground/90">{name}</span>
          </li>
        )
      })}
    </ul>
  )
}
