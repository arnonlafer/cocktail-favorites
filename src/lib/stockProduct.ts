import type { BarcodeProduct } from './barcodeLookup'
import type { StockCategory } from '../types'

type StockProductDetails = Pick<BarcodeProduct, 'name' | 'brand' | 'description'>

function comparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function titleCaseAllCaps(value: string): string {
  if (!/[A-Z]/.test(value) || /[a-z]/.test(value)) return value
  return value.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

export function normalizeStockProductName(product: StockProductDetails): string {
  const rawName = product.name.trim()
  const brand = product.brand?.trim()
  const withBrand =
    brand && !comparable(rawName).includes(comparable(brand)) ? `${brand} ${rawName}` : rawName

  const withoutPackSize = withBrand
    .replace(
      /\s*(?:\(|\[)\s*(?:pack\s+of\s+)?(?:\d+\s*[x×]\s*)?\d+(?:\.\d+)?\s*(?:fl\.?\s*oz\.?|ml|cl|l|liters?|litres?)(?:\s+bottle)?\s*(?:\)|])\s*$/i,
      '',
    )
    .replace(
      /(?:\s*[-–—,]\s*|\s+)(?:pack\s+of\s+)?(?:\d+\s*[x×]\s*)?\d+(?:\.\d+)?\s*(?:fl\.?\s*oz\.?|ml|cl|l|liters?|litres?)(?:\s+bottle)?\s*$/i,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim()

  return titleCaseAllCaps(withoutPackSize || withBrand)
}

export function inferStockCategory(product: StockProductDetails): StockCategory {
  const text = [product.name, product.brand, product.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[’']/g, '')

  if (
    /\b(amaro|amari|fernet|campari|aperol|cynar|averna|nonino|montenegro|ramazzotti|suze|punt e mes)\b/.test(
      text,
    )
  ) {
    return 'amaro'
  }
  if (
    /\b(vermouth|wine|sherry|port wine|madeira|marsala|lillet|cocchi americano|champagne|prosecco)\b/.test(
      text,
    )
  ) {
    return 'wine-vermouth'
  }
  if (/\bbitters?\b/.test(text)) return 'bitters'
  if (
    /\b(syrup|grenadine|orgeat|agave nectar|simple syrup|demerara|cream of coconut|cordial mixer)\b/.test(
      text,
    )
  ) {
    return 'syrup'
  }
  if (
    /\b(liqueur|liquor|triple sec|curaçao|curacao|amaretto|chartreuse|benedictine|cointreau|grand marnier|maraschino|st\.?\s*germain|kahlua|baileys|frangelico|crème de|creme de|irish cream|allspice dram|absinthe)\b/.test(
      text,
    )
  ) {
    return 'liqueur'
  }
  if (/\b(bourbon|kentucky straight)\b/.test(text)) return 'whiskey-bourbon'
  if (/\b(rye whiskey|rye whisky|straight rye)\b/.test(text)) return 'whiskey-rye'
  if (/\b(scotch|single malt|blended malt|islay|speyside|highland whisky)\b/.test(text)) {
    return 'whiskey-scotch'
  }
  if (/\b(whisk(?:e)?y|irish whiskey|canadian whisky)\b/.test(text)) return 'whiskey-other'
  if (/\b(tequila|mezcal|reposado|añejo|anejo|agave spirit)\b/.test(text)) {
    return 'tequila-mezcal'
  }
  if (/\b(gin|london dry|genever)\b/.test(text)) return 'gin'
  if (/\bvodka\b/.test(text)) return 'vodka'
  if (/\b(brandy|cognac|armagnac|pisco|calvados)\b/.test(text)) return 'brandy'
  if (/\b(rum|rhum|cachaça|cachaca)\b/.test(text)) return 'rum'

  return 'other'
}
