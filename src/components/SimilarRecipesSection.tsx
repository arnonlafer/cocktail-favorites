import { useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Cocktail } from '../types'
import { cocktailInitials, spiritGradient } from '../lib/cocktailUtils'

interface Props {
  cocktails: Cocktail[]
  title?: string
  /** When this changes, the row remounts and scroll returns to the start. */
  resetKey?: string
}

const MOVE_THRESHOLD = 10
const SCROLL_THRESHOLD = 2
const SCROLL_TAP_COOLDOWN_MS = 450

function SimilarRecipeCard({
  cocktail,
  onKeyOpen,
}: {
  cocktail: Cocktail
  onKeyOpen: (id: string) => void
}) {
  const gradient = spiritGradient(cocktail)

  return (
    <div
      role="button"
      tabIndex={0}
      data-cocktail-id={cocktail.id}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onKeyOpen(cocktail.id)
        }
      }}
      className="w-36 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-app bg-bar-900/80 text-left select-none"
    >
      <div className={`aspect-square bg-linear-to-br ${gradient}`}>
        {cocktail.imageUrl ? (
          <img
            src={cocktail.imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none h-full w-full object-cover"
          />
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
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const scrollerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    el.scrollLeft = 0

    const gesture = { startScrollLeft: 0, moved: false }
    let lastScrollAt = 0
    let touchStartX = 0
    let touchStartY = 0

    const scrollMoved = (startScrollLeft: number) =>
      Math.abs(el.scrollLeft - startScrollLeft) > SCROLL_THRESHOLD

    const blockTap = () => Date.now() - lastScrollAt < SCROLL_TAP_COOLDOWN_MS || gesture.moved

    const stopBubble = (e: TouchEvent) => e.stopPropagation()

    const onTouchStart = (e: TouchEvent) => {
      stopBubble(e)
      if (e.touches.length !== 1) return
      const t = e.touches[0]!
      touchStartX = t.clientX
      touchStartY = t.clientY
      gesture.moved = false
      gesture.startScrollLeft = el.scrollLeft
    }

    const onTouchMove = (e: TouchEvent) => {
      stopBubble(e)
      if (e.touches.length !== 1) return
      const t = e.touches[0]!
      if (
        Math.abs(t.clientX - touchStartX) > MOVE_THRESHOLD ||
        Math.abs(t.clientY - touchStartY) > MOVE_THRESHOLD ||
        scrollMoved(gesture.startScrollLeft)
      ) {
        gesture.moved = true
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      stopBubble(e)
      if (scrollMoved(gesture.startScrollLeft)) gesture.moved = true
    }

    const onScroll = () => {
      lastScrollAt = Date.now()
      gesture.moved = true
    }

    const onClick = (e: MouseEvent) => {
      e.stopPropagation()
      if (blockTap()) {
        e.preventDefault()
        return
      }
      const card = (e.target as Element | null)?.closest('[data-cocktail-id]')
      const id = card?.getAttribute('data-cocktail-id')
      if (id) navigateRef.current(`/cocktail/${id}`)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('click', onClick, { capture: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('click', onClick, { capture: true })
    }
  }, [resetKey])

  if (cocktails.length === 0) return null

  return (
    <section data-similar-section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div
        key={resetKey}
        ref={scrollerRef}
        data-similar-scroller
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [overflow-anchor:none] touch-pan-x"
      >
        {cocktails.map((cocktail) => (
          <SimilarRecipeCard
            key={cocktail.id}
            cocktail={cocktail}
            onKeyOpen={(id) => navigateRef.current(`/cocktail/${id}`)}
          />
        ))}
      </div>
    </section>
  )
}
