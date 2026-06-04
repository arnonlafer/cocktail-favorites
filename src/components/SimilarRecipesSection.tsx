import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Cocktail } from '../types'
import { cocktailInitials, spiritGradient } from '../lib/cocktailUtils'

interface Props {
  cocktails: Cocktail[]
  title?: string
  /** When this changes, horizontal scroll resets to the start. */
  resetKey?: string
}

const DRAG_THRESHOLD = 10

export function SimilarRecipesSection({
  cocktails,
  title = 'Similar recipes',
  resetKey,
}: Props) {
  const navigate = useNavigate()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, moved: false })

  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: 0 })
  }, [resetKey])

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    dragRef.current = {
      startX: touch?.clientX ?? 0,
      startY: touch?.clientY ?? 0,
      scrollLeft: scrollerRef.current?.scrollLeft ?? 0,
      moved: false,
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    const dx = Math.abs(touch.clientX - dragRef.current.startX)
    const dy = Math.abs(touch.clientY - dragRef.current.startY)
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) dragRef.current.moved = true
  }

  const onTouchEnd = () => {
    const el = scrollerRef.current
    if (el && Math.abs(el.scrollLeft - dragRef.current.scrollLeft) > DRAG_THRESHOLD) {
      dragRef.current.moved = true
    }
  }

  const openRecipe = useCallback(
    (cocktailId: string) => {
      if (dragRef.current.moved) {
        dragRef.current.moved = false
        return
      }
      navigate(`/cocktail/${cocktailId}`)
    },
    [navigate],
  )

  if (cocktails.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div
        ref={scrollerRef}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {cocktails.map((cocktail) => {
          const gradient = spiritGradient(cocktail)
          return (
            <button
              key={cocktail.id}
              type="button"
              onClick={() => openRecipe(cocktail.id)}
              className="w-36 shrink-0 overflow-hidden rounded-2xl border border-app bg-bar-900/80 text-left"
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
            </button>
          )
        })}
      </div>
    </section>
  )
}
