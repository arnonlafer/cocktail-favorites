import type { StockCategory, StockItem } from '../types'
import { STOCK_CATEGORY_ORDER } from '../types'

const LEGACY_STOCK_CATEGORIES: Record<string, StockCategory> = {
  spirit: 'other',
}

export function normalizeStockCategory(category: string | undefined): StockCategory {
  if (category && STOCK_CATEGORY_ORDER.includes(category as StockCategory)) {
    return category as StockCategory
  }
  if (category && LEGACY_STOCK_CATEGORIES[category]) {
    return LEGACY_STOCK_CATEGORIES[category]
  }
  return 'whiskey'
}

export function createStockItem(partial?: Partial<Pick<StockItem, 'name' | 'category' | 'open' | 'quantityLeft'>>): StockItem {
  return {
    id: `stock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: partial?.name?.trim() ?? '',
    category: partial?.category ? normalizeStockCategory(partial.category) : 'whiskey',
    open: partial?.open ?? false,
    quantityLeft: partial?.quantityLeft ?? 1,
  }
}

export function groupStockByCategory(items: StockItem[]): { category: StockCategory; items: StockItem[] }[] {
  const byCategory = new Map<StockCategory, StockItem[]>()
  for (const category of STOCK_CATEGORY_ORDER) {
    byCategory.set(category, [])
  }

  for (const item of items) {
    const category = normalizeStockCategory(item.category)
    const list = byCategory.get(category) ?? byCategory.get('other')!
    list.push({ ...item, category })
  }

  return STOCK_CATEGORY_ORDER.map((category) => ({
    category,
    items: (byCategory.get(category) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0)
}

export function isStockEmpty(item: Pick<StockItem, 'quantityLeft'>): boolean {
  return item.quantityLeft <= 0
}

export function formatQuantityLeft(quantity: number): string {
  if (quantity <= 0) return 'Empty'
  if (Number.isInteger(quantity)) return `${quantity} left`
  return `${quantity} left`
}

export function markStockItemEmpty(items: StockItem[], id: string): StockItem[] {
  const idx = items.findIndex((item) => item.id === id)
  if (idx < 0) return items
  const copy = [...items]
  copy[idx] = { ...copy[idx], quantityLeft: 0 }
  return copy
}

export function upsertStockItem(items: StockItem[], next: StockItem): StockItem[] {
  const normalized = { ...next, category: normalizeStockCategory(next.category) }
  const idx = items.findIndex((item) => item.id === normalized.id)
  if (idx < 0) return [...items, normalized]
  const copy = [...items]
  copy[idx] = normalized
  return copy
}

export function removeStockItem(items: StockItem[], id: string): StockItem[] {
  return items.filter((item) => item.id !== id)
}
