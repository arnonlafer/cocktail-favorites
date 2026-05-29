import type { FontSize, Theme } from '../types'

const FONT_SCALE: Record<FontSize, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.12,
  xl: 1.25,
}

export function applyAppearance(theme: Theme, fontSize: FontSize) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.setProperty('--font-scale', String(FONT_SCALE[fontSize]))

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#1a1210' : '#f4ede6')
  }
}

export const FONT_SIZE_ORDER: FontSize[] = ['sm', 'md', 'lg', 'xl']

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: 'Small',
  md: 'Default',
  lg: 'Large',
  xl: 'Extra large',
}

export function stepFontSize(current: FontSize, direction: 1 | -1): FontSize {
  const idx = FONT_SIZE_ORDER.indexOf(current)
  const next = Math.max(0, Math.min(FONT_SIZE_ORDER.length - 1, idx + direction))
  return FONT_SIZE_ORDER[next]
}
