import type { Cocktail, Ingredient } from '../types'
import { SPIRIT_ORDER } from '../types'

export type IngredientCategory =
  | 'main-spirit'
  | 'other-spirit'
  | 'liqueur-wine-amaro'
  | 'juice-citrus'
  | 'syrup-sweet'
  | 'bitters'
  | 'other'
  | 'garnish'

const CATEGORY_RANK: Record<IngredientCategory, number> = {
  'main-spirit': 0,
  'other-spirit': 1,
  'liqueur-wine-amaro': 2,
  'juice-citrus': 3,
  'syrup-sweet': 4,
  bitters: 5,
  other: 6,
  garnish: 7,
}

type SpiritCategory = (typeof SPIRIT_ORDER)[number]

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''´`]/g, "'")
    .replace(/\u200c/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isGarnish(name: string): boolean {
  const n = normalizeName(name)
  if (!n) return false
  if (/\bfor garnish\b/.test(n)) return true
  if (/\bas garnish\b/.test(n)) return true
  if (/\bgarnish\b/.test(n)) return true
  if (/\b(sugared rim|cocktail cherry for garnish|coffee beans for garnish)\b/.test(n)) return true
  if (/\b(plus .* for garnish|for the garnish)\b/.test(n)) return true
  if (/^(twist of|grated nutmeg|star anise \(optional\))/.test(n)) return true
  return false
}

function isBitters(name: string): boolean {
  const n = normalizeName(name)
  if (/\ballspice dram\b/.test(n)) return false
  return /\bbitters?\b/.test(n) || /\bdashes\b.*\bbitters?\b/.test(n)
}

function isJuiceOrCitrus(name: string): boolean {
  const n = normalizeName(name)
  if (/\bjuice\b/.test(n)) return true
  if (/\b(freshly squeezed|freshly pressed)\b/.test(n) && /\b(lemon|lime|grapefruit|orange|pineapple|watermelon)\b/.test(n)) {
    return true
  }
  if (/^ruby red grapefruit juice/.test(n)) return true
  return false
}

function isSyrupOrSweet(name: string): boolean {
  const n = normalizeName(name)
  if (/\bsyrup\b/.test(n)) return true
  if (/\b(agave nectar|agave syrup|simple syrup|demerara|orgeat|falernum|grenadine|honey syrup|maple syrup|cinnamon syrup|passion fruit syrup|turmeric honey|sugar syrup|cream of coconut)\b/.test(n)) {
    return true
  }
  if (/^agave(\s|$)/.test(n)) return true
  if (/^simple rich syrup/.test(n)) return true
  if (/^tablespoon sugar$/.test(n)) return true
  if (/^teaspoon s grenadine/.test(n)) return true
  return false
}

const SPIRIT_PATTERNS: Record<SpiritCategory, RegExp[]> = {
  Whiskey: [/\bbourbon\b/, /\brye\b/, /\bscotch\b/, /\bwhisk(e)?y\b/, /\irish\b/],
  Gin: [/\bgin\b/, /\blondon dry\b/],
  Tequila: [/\btequila\b/, /\bmezcal\b/, /\breposado\b/, /\bblanco\b/, /\bsilver tequila\b/],
  Vodka: [/\bvodka\b/],
  Rum: [/\brum\b/],
  Brandy: [/\bbrandy\b/, /\bcognac\b/],
  Pisco: [/\bpisco\b/],
  'Wine & Beer': [
    /\bwine\b/,
    /\bsherry\b/,
    /\bport\b/,
    /\bprosecco\b/,
    /\bchampagne\b/,
    /\bsparkling wine\b/,
    /\bbeer\b/,
    /\blager\b/,
  ],
  Other: [/\baquavit\b/],
}

function isLiqueurWineAmaro(name: string): boolean {
  const n = normalizeName(name)
  if (
    /\b(vermouth|campari|aperol|cynar|amaro|chartreuse|benedictine|cointreau|triple sec|maraschino liqueur|st\.? germain|elderflower liqueur|liqueur|cordial|lillet|suze|averna|fernet|kahlua|coffee liqueur|coffee liquor|amaretto|baileys|frangelico|creme de|crème de|curacao|punt e mes|cochi americano|chinola|ancho reyes|licor 43|peach liqueur|apricot|violet liqueur|banana liqueur|bourbon cream|irish cream|allspice dram|allspice liqueur|rucolino|sherry|px sherry|dry sparkling wine|sparkling wine|red wine|prosecco|champagne|absinthe|lager|beer)\b/.test(
      n,
    )
  ) {
    return true
  }
  if (/\bwine\b/.test(n) && !/\bvinegar\b/.test(n)) return true
  return false
}

function detectSpiritCategory(name: string): SpiritCategory | null {
  const n = normalizeName(name)

  if (
    /\b(vermouth|campari|aperol|cynar|amaro|chartreuse|benedictine|cointreau|triple sec|maraschino liqueur|st\.? germain|elderflower liqueur|liqueur|cordial|lillet|suze|averna|sherry|kahlua|coffee liqueur|coffee liquor|amaretto|baileys|frangelico|creme de|crème de|irish cream|bourbon cream|allspice dram|wine)\b/.test(
      n,
    ) &&
    !/\b(bourbon whiskey|rye whiskey|blanco tequila|white rum|aged rum|dry gin|london dry gin|mezcal|pisco|vodka|scotch|whiskey|bourbon,|^\d|oz bourbon)\b/.test(
      n,
    )
  ) {
    return null
  }

  for (const spirit of SPIRIT_ORDER) {
    if (SPIRIT_PATTERNS[spirit].some((pattern) => pattern.test(n))) return spirit
  }

  return null
}

function spiritMatchesCategory(spiritCategory: SpiritCategory, cocktailSpirit: SpiritCategory): boolean {
  if (spiritCategory === cocktailSpirit) return true
  if (cocktailSpirit === 'Tequila' && spiritCategory === 'Tequila') return true
  if (cocktailSpirit === 'Other' && (spiritCategory === 'Tequila' || spiritCategory === 'Other')) return true
  return false
}

function isMainSpirit(name: string, cocktailSpirits: string[]): boolean {
  const category = detectSpiritCategory(name)
  if (!category) return false
  return cocktailSpirits.some((spirit) => spiritMatchesCategory(category, spirit as SpiritCategory))
}

function isOtherSpirit(name: string, cocktailSpirits: string[]): boolean {
  return detectSpiritCategory(name) != null && !isMainSpirit(name, cocktailSpirits)
}

export function classifyIngredient(name: string, cocktailSpirits: string[]): IngredientCategory {
  if (isGarnish(name)) return 'garnish'
  if (isBitters(name)) return 'bitters'
  if (isMainSpirit(name, cocktailSpirits)) return 'main-spirit'
  if (isOtherSpirit(name, cocktailSpirits)) return 'other-spirit'
  if (isJuiceOrCitrus(name)) return 'juice-citrus'
  if (isSyrupOrSweet(name)) return 'syrup-sweet'
  if (isLiqueurWineAmaro(name)) return 'liqueur-wine-amaro'
  return 'other'
}

export function sortIngredients(cocktail: Pick<Cocktail, 'spirits' | 'ingredients'>): Ingredient[] {
  return cocktail.ingredients
    .map((ingredient, index) => ({
      ingredient,
      index,
      rank: CATEGORY_RANK[classifyIngredient(ingredient.name, cocktail.spirits)],
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ ingredient }) => ingredient)
}

export function sortCocktailIngredients(cocktail: Cocktail): Cocktail {
  return {
    ...cocktail,
    ingredients: sortIngredients(cocktail),
  }
}
