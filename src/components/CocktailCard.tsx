import type { Cocktail } from '../types'
import { cocktailInitials, primarySpirit, spiritGradient } from '../lib/cocktailUtils'
import { IconHeart } from './icons'

interface Props {
  cocktail: Cocktail
  isFavorite: boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  onClick: () => void
}

export function CocktailCard({ cocktail, isFavorite, onToggleFavorite, onClick }: Props) {
  const gradient = spiritGradient(cocktail)
  const spirit = primarySpirit(cocktail)

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-app bg-bar-900/80 p-3 transition active:scale-[0.98]">
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-linear-to-br ${gradient}`}
        >
          {cocktail.imageUrl ? (
            <img
              key={cocktail.imageUrl}
              src={cocktail.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-foreground/90">
              {cocktailInitials(cocktail.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">{cocktail.name}</h3>
          <p className="truncate text-xs text-muted">
            {spirit} · {cocktail.method} · {cocktail.glass}
          </p>
        </div>
      </button>

      <button
        type="button"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={onToggleFavorite}
        className="shrink-0 rounded-full p-2 transition hover:bg-surface-muted"
      >
        <IconHeart filled={isFavorite} size={20} className={isFavorite ? 'text-amber-accent' : 'text-muted'} />
      </button>
    </div>
  )
}
