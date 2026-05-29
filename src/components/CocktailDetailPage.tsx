import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Cocktail, UnitSystem } from '../types'
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
}

export function CocktailDetailPage({
  cocktails,
  favorites,
  unit,
  multiplier,
  onUnitChange,
  onMultiplierChange,
  onFavoriteChange,
}: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const cocktail = cocktails.find((c) => c.id === id)
  const isFavorite = id ? favorites.includes(id) : false

  useEffect(() => {
    if (id) markRecentlyViewed(id)
  }, [id])

  if (!cocktail) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-white/70">Cocktail not found.</p>
        <Link to="/" className="mt-4 inline-block text-amber-accent">
          Back to list
        </Link>
      </div>
    )
  }

  const gradient = spiritGradient(cocktail)

  return (
    <div className="safe-bottom pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-bar-950/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="text-amber-accent">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <Link
            to={`/cocktail/${cocktail.id}/edit`}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80"
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
          <img src={cocktail.imageUrl} alt={cocktail.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="font-display text-5xl font-bold text-white/90">{cocktailInitials(cocktail.name)}</span>
            <span className="text-sm uppercase tracking-[0.2em] text-white/50">{cocktail.spirits.join(' · ')}</span>
          </div>
        )}
      </div>

      <div className="space-y-6 px-4 pt-5">
        <header>
          <h1 className="font-display text-3xl font-bold leading-tight text-white">{cocktail.name}</h1>
          <p className="mt-2 text-sm text-amber-light/80">{subtitle(cocktail)}</p>
        </header>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Ingredients</h2>
              <p className="text-xs text-white/45">Amounts in {unit === 'oz' ? 'ounces' : 'milliliters'}</p>
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
            <h2 className="mb-3 text-lg font-semibold text-white">Garnish</h2>
            <p className="rounded-2xl border border-white/8 bg-bar-900/60 px-4 py-3 text-sm text-white/90">
              {cocktail.garnish}
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Instructions</h2>
          <InstructionList steps={cocktail.instructions} />
        </section>
      </div>
    </div>
  )
}
