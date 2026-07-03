export interface Ingredient {
  amount: number | null
  unit: string | null
  name: string
}

export interface IngredientNutrition {
  id: string
  name: string
  caloriesPerOz: number
  carbsPerOz: number
  aliases?: string[]
  custom?: boolean
}

export type CocktailClassification = 'classic' | 'modern-classic' | 'contemporary'

export interface CocktailOrigin {
  classification: CocktailClassification
  year?: string
  creator?: string
  note?: string
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
  /** Manually curated similar recipes; falls back to auto-match when empty. */
  similarIds?: string[]
  /** User override; falls back to built-in research in cocktail-origins.json. */
  origin?: CocktailOrigin
}

export type UnitSystem = 'oz' | 'ml'
export type Theme = 'dark' | 'dim' | 'light'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type ListView = 'list' | 'grid'
export type HomeGroupView = 'spirits' | 'all'
export type CocktailSort = 'recent' | 'alphabetical'

export interface Collection {
  id: string
  name: string
  cocktailIds: string[]
}

export interface CartItem {
  id: string
  name: string
}

export type StockCategory = 'spirit' | 'liqueur' | 'syrup' | 'citrus' | 'other'

export interface StockItem {
  id: string
  name: string
  category: StockCategory
  open: boolean
  quantityLeft: number
}

export const STOCK_CATEGORY_ORDER: StockCategory[] = ['spirit', 'liqueur', 'syrup', 'citrus', 'other']

export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  spirit: 'Spirit',
  liqueur: 'Liqueur',
  syrup: 'Syrup',
  citrus: 'Citrus',
  other: 'Other',
}

export type AiVendor = 'openai' | 'anthropic' | 'gemini'

export interface AiSettings {
  vendor: AiVendor
  apiKey: string
  model: string
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface AiChat {
  id: string
  title: string
  messages: AiMessage[]
  createdAt: number
  updatedAt: number
}

/** Per-user settings synced by username key. */
export interface UserProfile {
  userName: string
  favorites: string[]
  recentlyViewed: Record<string, number>
  unit: UnitSystem
  multiplier: number
  theme: Theme
  fontSize: FontSize
  collapsedGroups: string[] | null
  listView: ListView
  collections: Collection[]
  /** Free-form recipe notes, one continuous draft per user. */
  recipeDraft: string
  /** Shopping list for spirits, syrups, bitters, etc. */
  cart: CartItem[]
  /** Bar inventory tracked on the Stock tab. */
  stock: StockItem[]
  /** Default category when adding a new stock item. */
  lastStockCategory: StockCategory
  /** URL template for opening cart items; use `{query}` for the item name. */
  cartSearchUrl?: string
  /** When true, the random recipe button only picks from favorites. */
  randomFavoritesOnly: boolean
  /** Home screen grouping: by spirit or flat list. */
  homeGroupView: HomeGroupView
  /** Home screen recipe order. */
  cocktailSort: CocktailSort
  updatedAt: number
}

/** View model: current user profile + shared sync settings. */
export interface AppPreferences {
  favorites: string[]
  recentlyViewed: Record<string, number>
  unit: UnitSystem
  multiplier: number
  theme: Theme
  fontSize: FontSize
  collapsedGroups: string[] | null
  userName: string
  syncCode: string
  syncUpdatedAt: number
  lastSyncedAt: number | null
  listView: ListView
  collections: Collection[]
  recipeDraft: string
  cart: CartItem[]
  stock: StockItem[]
  lastStockCategory: StockCategory
  cartSearchUrl: string
  randomFavoritesOnly: boolean
  homeGroupView: HomeGroupView
  cocktailSort: CocktailSort
}

export interface SyncPayload {
  updatedAt: number
  edits: Record<string, Cocktail>
  custom: Cocktail[]
  deletedIds: string[]
  nutritionOverrides: IngredientNutrition[]
  syncCode: string
  userProfiles: Record<string, UserProfile>
  /** @deprecated legacy single-user prefs — migrated on read */
  prefs?: AppPreferences
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
