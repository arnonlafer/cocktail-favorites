import { useCallback, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Cocktail } from '../types'
import { cocktailInitials, spiritGradient } from '../lib/cocktailUtils'

interface Props {
  cocktails: Cocktail[]
  title?: string
  /** When this changes, the row remounts and scroll returns to the start. */
  resetKey?: string
}

const MOVE_THRESHOLD = 8
const SCROLL_SUPPRESS_MS = 400

interface CardProps {
  cocktail: Cocktail
  suppressTapUntil: React.RefObject<number>
  onOpen: (id: string) => void
}

function SimilarRecipeCard({ cocktail, suppressTapUntil, onOpen }: CardProps) {
  const pointerRef = useRef({ id: -1, x: 0, y: 0, moved: false })
  const gradient = spiritGradient(cocktail)

  const tryOpen = useCallback(() => {
    if (pointerRef.current.moved) return
    if (Date.now() < suppressTapUntil.current) return
    onOpen(cocktail.id)
  }, [cocktail.id, onOpen, suppressTapUntil])

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        pointerRef.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          moved: false,
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointerRef.current.id) return
        const dx = e.clientX - pointerRef.current.x
        const dy = e.clientY - pointerRef.current.y
        if (Math.hypot(dx, dy) > MOVE_THRESHOLD) pointerRef.current.moved = true
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pointerRef.current.id) return
        tryOpen()
        pointerRef.current.moved = false
      }}
      onPointerCancel={() => {
        pointerRef.current.moved = false
      }}
      onClick={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(cocktail.id)
        }
      }}
      className="w-36 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-app bg-bar-900/80 text-left touch-pan-x"
    >
      <div className={`aspect-square bg-linear-to-br ${gradient}`}>
        {cocktail.imageUrl ? (
          <img src={cocktail.imageUrl} alt="" className="pointer-events-none h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-2xl font-bold text-foreground/90">
            {cocktailInitials(cocktail.name)}
          </div>
        )}
      </div>
      <p className="line-clamp-2 p-2.5 text-xs font-semibold leading-snug text-foreground">
        {cocktail.name}
      </p>
    </div>
  )
}

export function SimilarRecipesSection({
  cocktails,
  title = 'Similar recipes',
  resetKey,
}: Props) {
  const navigate = useNavigate()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const suppressTapUntil = useRef(0)
  const scrollEndTimer = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    el.scrollLeft = 0

    const markScrolling = () => {
      suppressTapUntil.current = Date.now() + SCROLL_SUPPRESS_MS
      window.clearTimeout(scrollEndTimer.current)
      scrollEndTimer.current = window.setTimeout(() => {
        suppressTapUntil.current = Date.now() + SCROLL_SUPPRESS_MS
      }, 120)
    }

    el.addEventListener('scroll', markScrolling, { passive: true })
    return () => {
      el.removeEventListener('scroll', markScrolling)
      window.clearTimeout(scrollEndTimer.current)
    }
  }, [resetKey])

  const openRecipe = useCallback(
    (cocktailId: string) => {
      navigate(`/cocktail/${cocktailId}`)
    },
    [navigate],
  )

  if (cocktails.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div
        key={resetKey}
        ref={scrollerRef}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [overflow-anchor:none] touch-pan-x"
      >
        {cocktails.map((cocktail) => (
          <SimilarRecipeCard
            key={cocktail.id}
            cocktail={cocktail}
            suppressTapUntil={suppressTapUntil}
            onOpen={openRecipe}
          />
        ))}
      </div>
    </section>
  )
}
