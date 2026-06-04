import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Cocktail, Collection, UnitSystem } from '../types'
import { browseNeighbors, resolveBrowseIds, saveBrowseIds } from '../lib/browse'
import { scrollToTop } from '../lib/scroll'
import { calculateCocktailNutrition } from '../lib/nutrition'
import { cocktailInitials, spiritGradient, subtitle } from '../lib/cocktailUtils'
import { markRecentlyViewed, toggleFavorite } from '../lib/storage'
import { resolveSimilarCocktails } from '../lib/similar'
import { CollectionPicker } from './CollectionPicker'
import { SimilarRecipesSection } from './SimilarRecipesSection'
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconCollections, IconEdit, IconHeart } from './icons'
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

function isSwipeExcluded(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-similar-scroller], [data-similar-section]')
}

const iconBtnClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition disabled:opacity-30'

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
  const touchStartY = useRef<number | null>(null)
  const pageSwipeActive = useRef(false)
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
    scrollToTop()
  }, [id])

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

  const similar = useMemo(
    () => (cocktail ? resolveSimilarCocktails(cocktail, cocktails) : []),
    [cocktail, cocktails],
  )

  if (!cocktail) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted">Cocktail not found.</p>
        <button type="button" onClick={goBack} aria-label="Back" className={`${iconBtnClass} text-amber-accent`}>
          <IconArrowLeft size={20} />
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
        if (isSwipeExcluded(e.target)) {
          pageSwipeActive.current = false
          return
        }
        pageSwipeActive.current = true
        touchStartX.current = e.touches[0]?.clientX ?? null
        touchStartY.current = e.touches[0]?.clientY ?? null
      }}
      onTouchEnd={(e) => {
        if (!pageSwipeActive.current) return
        pageSwipeActive.current = false
        if (touchStartX.current == null || touchStartY.current == null) return
        const endX = e.changedTouches[0]?.clientX
        const endY = e.changedTouches[0]?.clientY
        if (endX == null || endY == null) return
        const deltaX = endX - touchStartX.current
        const deltaY = endY - touchStartY.current
        touchStartX.current = null
        touchStartY.current = null
        if (Math.abs(deltaX) < SWIPE_THRESHOLD) return
        if (Math.abs(deltaX) < Math.abs(deltaY)) return
        if (deltaX < 0 && nextId) goToCocktail(nextId)
        if (deltaX > 0 && prevId) goToCocktail(prevId)
      }}
    >
      <div className="sticky top-0 z-10 border-b border-app bg-app px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={goBack} aria-label="Back" className={iconBtnClass}>
            <IconArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            {showBrowse && (
              <>
                <button
                  type="button"
                  disabled={!prevId}
                  aria-label="Previous recipe"
                  onClick={() => prevId && goToCocktail(prevId)}
                  className={iconBtnClass}
                >
                  <IconChevronLeft size={20} />
                </button>
                <span className="min-w-[3rem] text-center text-xs text-subtle">
                  {index + 1}/{total}
                </span>
                <button
                  type="button"
                  disabled={!nextId}
                  aria-label="Next recipe"
                  onClick={() => nextId && goToCocktail(nextId)}
                  className={iconBtnClass}
                >
                  <IconChevronRight size={20} />
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="Add to collection"
              onClick={() => setShowCollections(true)}
              className={iconBtnClass}
            >
              <IconCollections size={20} />
            </button>
            <Link
              to={`/cocktail/${cocktail.id}/edit`}
              aria-label="Edit recipe"
              className={iconBtnClass}
            >
              <IconEdit size={20} />
            </Link>
            <button
              type="button"
              aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
              className={iconBtnClass}
              onClick={() => {
                toggleFavorite(cocktail.id)
                onFavoriteChange()
              }}
            >
              <IconHeart filled={isFavorite} size={20} className={isFavorite ? 'text-amber-accent' : undefined} />
            </button>
          </div>
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

        <SimilarRecipesSection key={cocktail.id} cocktails={similar} resetKey={cocktail.id} />
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
