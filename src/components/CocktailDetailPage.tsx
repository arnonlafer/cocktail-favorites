import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Cocktail, Collection, UnitSystem } from '../types'
import { browseNeighbors, resolveBrowseIds, saveBrowseIds } from '../lib/browse'
import { calculateCocktailNutrition } from '../lib/nutrition'
import { cocktailInitials, spiritGradient, subtitle } from '../lib/cocktailUtils'
import { markRecentlyViewed, toggleFavorite } from '../lib/storage'
import { CollectionPicker } from './CollectionPicker'
import { UnitControls } from './UnitControls'
import { IngredientList } from './IngredientList'
import { InstructionList } from './InstructionList'

interface BrowseState {
  browseIds?: string[]
}

interface Props {
  cocktails: Cocktail[]
  favorites: string[]
  collections: Collection[]
  unit: UnitSystem
  multiplier: number
  onUnitChange: (unit: UnitSystem) => void
  onMultiplierChange: (multiplier: number) => void
  onFavoriteChange: () => void
  onViewed: () => void
}

const SWIPE_THRESHOLD = 60

export function CocktailDetailPage({
  cocktails,
  favorites,
  collections,
  unit,
  multiplier,
  onUnitChange,
  onMultiplierChange,
  onFavoriteChange,
  onViewed,
}: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const touchStartX = useRef<number | null>(null)
  const [showCollections, setShowCollections] = useState(false)

  const cocktail = cocktails.find((c) => c.id === id)
  const isFavorite = id ? favorites.includes(id) : false

  const allIds = useMemo(() => cocktails.map((c) => c.id), [cocktails])
  const browseIds = useMemo(
    () => resolveBrowseIds((location.state as BrowseState | null)?.browseIds, id ?? '', allIds),
    [location.state, id, allIds],
  )

  const { index, prevId, nextId, total } = useMemo(
    () => (id ? browseNeighbors(browseIds, id) : { index: -1, prevId: null, nextId: null, total: 0 }),
    [browseIds, id],
  )

  const filterSearch = searchParams.toString()

  const goToCocktail = useCallback(
    (targetId: string) => {
      saveBrowseIds(browseIds)
      navigate(`/cocktail/${targetId}${filterSearch ? `?${filterSearch}` : ''}`, {
        replace: true,
        state: { browseIds },
      })
    },
    [browseIds, filterSearch, navigate],
  )

  const goBack = useCallback(() => {
    if (filterSearch) {
      navigate(`/?${filterSearch}`)
      return
    }
    navigate('/')
  }, [filterSearch, navigate])

  useEffect(() => {
    if (id) {
      markRecentlyViewed(id)
      onViewed()
    }
  }, [id, onViewed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && prevId) goToCocktail(prevId)
      if (event.key === 'ArrowRight' && nextId) goToCocktail(nextId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goToCocktail, nextId, prevId])

  const nutrition = useMemo(
    () => (cocktail ? calculateCocktailNutrition(cocktail, multiplier) : null),
    [cocktail, multiplier],
  )

  if (!cocktail) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted">Cocktail not found.</p>
        <button type="button" onClick={goBack} className="mt-4 inline-block text-amber-accent">
          Back to list
        </button>
      </div>
    )
  }

  const gradient = spiritGradient(cocktail)
  const showBrowse = total > 1 && index >= 0

  return (
    <div
      className="safe-bottom pb-24"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return
        const endX = e.changedTouches[0]?.clientX
        if (endX == null) return
        const delta = endX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(delta) < SWIPE_THRESHOLD) return
        if (delta < 0 && nextId) goToCocktail(nextId)
        if (delta > 0 && prevId) goToCocktail(prevId)
      }}
    >
      <div className="sticky top-0 z-10 border-b border-app bg-app px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <button type="button" onClick={goBack} className="text-amber-accent">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCollections(true)}
              className="rounded-lg border border-app-strong px-3 py-1.5 text-xs font-medium text-muted"
            >
              Collection
            </button>
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
        {showBrowse && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!prevId}
              onClick={() => prevId && goToCocktail(prevId)}
              className="rounded-lg border border-app px-3 py-1 text-xs font-medium text-muted disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="text-xs text-subtle">
              {index + 1} of {total}
            </span>
            <button
              type="button"
              disabled={!nextId}
              onClick={() => nextId && goToCocktail(nextId)}
              className="rounded-lg border border-app px-3 py-1 text-xs font-medium text-muted disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
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
          {showBrowse && (
            <p className="mt-1 text-xs text-subtle">Swipe left/right for next or previous recipe</p>
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

      {showCollections && id && (
        <CollectionPicker
          cocktailId={id}
          collections={collections}
          onClose={() => setShowCollections(false)}
          onChanged={onViewed}
        />
      )}
    </div>
  )
}
