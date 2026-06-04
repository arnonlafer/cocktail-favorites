import { Link } from 'react-router-dom'
import type { Cocktail } from '../types'
import { cocktailInitials, spiritGradient } from '../lib/cocktailUtils'

interface Props {
  cocktails: Cocktail[]
  title?: string
}

export function SimilarRecipesSection({ cocktails, title = 'Similar recipes' }: Props) {
  if (cocktails.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {cocktails.map((cocktail) => {
          const gradient = spiritGradient(cocktail)
          return (
            <Link
              key={cocktail.id}
              to={`/cocktail/${cocktail.id}`}
              className="w-36 shrink-0 overflow-hidden rounded-2xl border border-app bg-bar-900/80"
            >
              <div className={`aspect-square bg-linear-to-br ${gradient}`}>
                {cocktail.imageUrl ? (
                  <img src={cocktail.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-2xl font-bold text-foreground/90">
                    {cocktailInitials(cocktail.name)}
                  </div>
                )}
              </div>
              <p className="line-clamp-2 p-2.5 text-xs font-semibold leading-snug text-foreground">
                {cocktail.name}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
