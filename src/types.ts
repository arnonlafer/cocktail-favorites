export interface Ingredient {
  amount: number | null
  unit: string | null
  name: string
}

export interface Cocktail {
  id: string
  name: string
  method: string
  glass: string
  ice: string
  spirits: string[]
  ingredients: Ingredient[]
  garnish: string | null
  instructions: string[]
  imageUrl: string | null
  custom?: boolean
}

export type UnitSystem = 'oz' | 'ml'
export type Theme = 'dark' | 'light'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AppPreferences {
  favorites: string[]
  recentlyViewed: Record<string, number>
  unit: UnitSystem
  multiplier: number
  theme: Theme
  fontSize: FontSize
  /** null = auto-collapse all except last-viewed cocktail's group(s) */
  collapsedGroups: string[] | null
  /** Same code on all devices to sync edits, custom cocktails, and preferences */
  syncCode: string
  syncUpdatedAt: number
  lastSyncedAt: number | null
}

export interface SyncPayload {
  updatedAt: number
  edits: Record<string, Cocktail>
  custom: Cocktail[]
  deletedIds: string[]
  prefs: AppPreferences
}

export const SPIRIT_ORDER = [
  'Whiskey',
  'Gin',
  'Tequila',
  'Vodka',
  'Rum',
  'Brandy',
  'Pisco',
  'Wine & Beer',
  'Other',
] as const

export const SPIRIT_COLORS: Record<string, string> = {
  Whiskey: 'from-amber-900 to-amber-700',
  Gin: 'from-emerald-900 to-emerald-600',
  Tequila: 'from-lime-900 to-lime-600',
  Vodka: 'from-slate-700 to-slate-500',
  Rum: 'from-orange-900 to-amber-700',
  Brandy: 'from-rose-900 to-rose-700',
  Pisco: 'from-yellow-900 to-yellow-600',
  'Wine & Beer': 'from-purple-900 to-purple-600',
  Other: 'from-stone-800 to-stone-600',
}

export const METHOD_OPTIONS = ['Shaken', 'Stirred', 'Built', 'Muddled', 'Blended'] as const
export const GLASS_OPTIONS = ['Coupe', 'Rocks', 'Martini', 'Highball', 'Tiki', 'Flute', 'Wine'] as const
export const ICE_OPTIONS = ['None', '1 large cube', 'Cubed', 'Crushed', 'Pebbles'] as const
export const SPIRIT_OPTIONS = [...SPIRIT_ORDER]
