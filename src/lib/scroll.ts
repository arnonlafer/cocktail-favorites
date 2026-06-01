const HOME_SCROLL_KEY = 'cocktail-favorites:home-scroll'

export function scrollToTop() {
  window.scrollTo(0, 0)
}

export function saveHomeScroll() {
  sessionStorage.setItem(HOME_SCROLL_KEY, String(window.scrollY))
}

export function restoreHomeScroll() {
  const raw = sessionStorage.getItem(HOME_SCROLL_KEY)
  if (raw == null) return
  sessionStorage.removeItem(HOME_SCROLL_KEY)
  const y = Number(raw)
  if (!Number.isFinite(y)) return
  requestAnimationFrame(() => window.scrollTo(0, y))
}
