import type { Cocktail } from '../types'
import { cocktailInitials, primarySpirit, spiritGradient } from '../lib/cocktailUtils'

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
          <span className="absolute bottom-1 left-1 rounded bg-black/40 px-1 text-[10px] uppercase tracking-wide text-amber-light/90">
            {spirit.slice(0, 3)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">{cocktail.name}</h3>
          <p className="truncate text-xs text-muted">
            {cocktail.method} · {cocktail.glass}
          </p>
        </div>
      </button>

      <button
        type="button"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={onToggleFavorite}
        className="shrink-0 rounded-full p-2 text-xl leading-none transition hover:bg-surface-muted"
      >
        {isFavorite ? '❤️' : '🤍'}
      </button>
    </div>
  )
}
