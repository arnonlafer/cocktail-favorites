import type { Cocktail } from '../types'
import { calculateCocktailNutrition } from '../lib/nutrition'
import { cocktailInitials, primarySpirit, spiritGradient } from '../lib/cocktailUtils'

interface Props {
  cocktail: Cocktail
  isFavorite: boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  onClick: () => void
}

export function CocktailGridCard({ cocktail, isFavorite, onToggleFavorite, onClick }: Props) {
  const gradient = spiritGradient(cocktail)
  const spirit = primarySpirit(cocktail)
  const nutrition = calculateCocktailNutrition(cocktail)

  return (
    <div className="overflow-hidden rounded-2xl border border-app bg-bar-900/80">
      <button type="button" onClick={onClick} className="block w-full text-left">
        <div className={`relative aspect-square w-full bg-linear-to-br ${gradient}`}>
          {cocktail.imageUrl ? (
            <img
              key={cocktail.imageUrl}
              src={cocktail.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1">
              <span className="font-display text-3xl font-bold text-foreground/90">
                {cocktailInitials(cocktail.name)}
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-subtle">
                {cocktail.spirits.join(' · ')}
              </span>
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-light/90">
            {spirit.slice(0, 3)}
          </span>
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {cocktail.name}
          </h3>
          <p className="mt-1 text-[11px] text-muted">
            {cocktail.method} · {cocktail.glass}
          </p>
          <p className="mt-1 text-[11px] text-subtle">
            {nutrition.calories} cal · {nutrition.carbs}g carbs
          </p>
        </div>
      </button>
      <div className="flex justify-end border-t border-app px-2 py-1">
        <button
          type="button"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={onToggleFavorite}
          className="rounded-full p-2 text-lg leading-none"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  )
}
