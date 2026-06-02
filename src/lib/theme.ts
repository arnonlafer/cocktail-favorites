import type { FontSize, Theme } from '../types'

export const THEME_ORDER: Theme[] = ['dark', 'dim', 'light']

export const THEME_LABELS: Record<Theme, string> = {
  dark: 'Dark',
  dim: 'Dim',
  light: 'Light',
}

const THEME_COLOR_META: Record<Theme, string> = {
  dark: '#1a1210',
  dim: '#262220',
  light: '#f4ede6',
}

const FONT_SCALE: Record<FontSize, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.12,
  xl: 1.25,
}

export function normalizeTheme(theme: string | undefined): Theme {
  if (theme === 'dark' || theme === 'dim' || theme === 'light') return theme
  return 'dark'
}

export function applyAppearance(theme: Theme, fontSize: FontSize) {
  const resolved = normalizeTheme(theme)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.setProperty('--font-scale', String(FONT_SCALE[fontSize]))

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEME_COLOR_META[resolved])
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
