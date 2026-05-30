import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Cocktail, UnitSystem } from '../types'
import { calculateCocktailNutrition } from '../lib/nutrition'
import { cocktailInitials, spiritGradient, subtitle } from '../lib/cocktailUtils'
import { markRecentlyViewed, toggleFavorite } from '../lib/storage'
import { UnitControls } from './UnitControls'
import { IngredientList } from './IngredientList'
import { InstructionList } from './InstructionList'

interface Props {
  cocktails: Cocktail[]
  favorites: string[]
  unit: UnitSystem
  multiplier: number
  onUnitChange: (unit: UnitSystem) => void
  onMultiplierChange: (multiplier: number) => void
  onFavoriteChange: () => void
  onViewed: () => void
}

export function CocktailDetailPage({
  cocktails,
  favorites,
  unit,
  multiplier,
  onUnitChange,
  onMultiplierChange,
  onFavoriteChange,
  onViewed,
}: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const cocktail = cocktails.find((c) => c.id === id)
  const isFavorite = id ? favorites.includes(id) : false

  useEffect(() => {
    if (id) {
      markRecentlyViewed(id)
      onViewed()
    }
  }, [id, onViewed])

  const nutrition = useMemo(
    () => (cocktail ? calculateCocktailNutrition(cocktail, multiplier) : null),
    [cocktail, multiplier],
  )

  if (!cocktail) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted">Cocktail not found.</p>
        <Link to="/" className="mt-4 inline-block text-amber-accent">
          Back to list
        </Link>
      </div>
    )
  }

  const gradient = spiritGradient(cocktail)

  return (
    <div className="safe-bottom pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-app bg-app px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="text-amber-accent">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <Link
            to={`/cocktail/${cocktail.id}/edit`}
            className="rounded-lg border border-app-strong px-3 py-1.5 text-xs font-medium text-muted"
          >
            Edit
          </Link>
          <button
            type="button"
            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
            className="text-2xl"
            onClick={() => {
              toggleFavorite(cocktail.id)
              onFavoriteChange()
            }}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      <div className={`mx-4 mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-linear-to-br ${gradient}`}>
        {cocktail.imageUrl ? (
          <img
            key={cocktail.imageUrl}
            src={cocktail.imageUrl}
            alt={cocktail.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="font-display text-5xl font-bold text-foreground/90">{cocktailInitials(cocktail.name)}</span>
            <span className="text-sm uppercase tracking-[0.2em] text-subtle">{cocktail.spirits.join(' · ')}</span>
          </div>
        )}
      </div>

      <div className="space-y-6 px-4 pt-5">
        <header>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground">{cocktail.name}</h1>
          <p className="mt-2 text-sm text-amber-light/80">{subtitle(cocktail)}</p>
          {nutrition && (
            <p className="mt-2 text-sm text-muted">
              {nutrition.calories} calories · {nutrition.carbs}g carbs
              {nutrition.unknown.length > 0 && (
                <span className="text-subtle"> · {nutrition.unknown.length} ingredient(s) not in database</span>
              )}
            </p>
          )}
        </header>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Ingredients</h2>
              <p className="text-xs text-subtle">Amounts in {unit === 'oz' ? 'ounces' : 'milliliters'}</p>
            </div>
            <UnitControls
              unit={unit}
              multiplier={multiplier}
              onUnitChange={onUnitChange}
              onMultiplierChange={onMultiplierChange}
            />
          </div>
          <IngredientList ingredients={cocktail.ingredients} unit={unit} multiplier={multiplier} />
        </section>

        {cocktail.garnish && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Garnish</h2>
            <p className="rounded-2xl border border-app bg-bar-900/60 px-4 py-3 text-sm text-foreground/90">
              {cocktail.garnish}
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Instructions</h2>
          <InstructionList steps={cocktail.instructions} />
        </section>
      </div>
    </div>
  )
}
