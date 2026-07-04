import type { FontSize, Theme } from '../types'

const LOCAL_UI_KEY = 'cocktail-favorites:local-ui'
const CURRENT_USER_KEY = 'cocktail-favorites:current-user'

export interface LocalUiPrefs {
  theme: Theme
  fontSize: FontSize
  syncCode: string
  lastSyncedAt: number | null
}

const defaultLocalUi: LocalUiPrefs = {
  theme: 'dark',
  fontSize: 'md',
  syncCode: '',
  lastSyncedAt: null,
}

export function loadLocalUiPrefs(): LocalUiPrefs {
  try {
    const raw = localStorage.getItem(LOCAL_UI_KEY)
    if (raw) return { ...defaultLocalUi, ...(JSON.parse(raw) as Partial<LocalUiPrefs>) }
  } catch {
    /* ignore */
  }
  return { ...defaultLocalUi }
}

export function saveLocalUiPrefs(partial: Partial<LocalUiPrefs>) {
  const next = { ...loadLocalUiPrefs(), ...partial }
  localStorage.setItem(LOCAL_UI_KEY, JSON.stringify(next))
  return next
}

export function getCurrentUserKey(): string {
  return localStorage.getItem(CURRENT_USER_KEY) ?? ''
}

export function setCurrentUserKey(key: string) {
  if (key) localStorage.setItem(CURRENT_USER_KEY, key)
  else localStorage.removeItem(CURRENT_USER_KEY)
}
