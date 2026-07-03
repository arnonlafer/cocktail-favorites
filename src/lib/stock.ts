import type { StockCategory, StockItem } from '../types'
import { STOCK_CATEGORY_ORDER } from '../types'

export function createStockItem(partial?: Partial<Pick<StockItem, 'name' | 'category' | 'open' | 'quantityLeft'>>): StockItem {
  return {
    id: `stock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: partial?.name?.trim() ?? '',
    category: partial?.category ?? 'spirit',
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
    const list = byCategory.get(item.category) ?? byCategory.get('other')!
    list.push(item)
  }

  return STOCK_CATEGORY_ORDER.map((category) => ({
    category,
    items: (byCategory.get(category) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0)
}

export function formatQuantityLeft(quantity: number): string {
  if (quantity <= 0) return 'Empty'
  if (Number.isInteger(quantity)) return `${quantity} left`
  return `${quantity} left`
}

export function upsertStockItem(items: StockItem[], next: StockItem): StockItem[] {
  const idx = items.findIndex((item) => item.id === next.id)
  if (idx < 0) return [...items, next]
  const copy = [...items]
  copy[idx] = next
  return copy
}

export function removeStockItem(items: StockItem[], id: string): StockItem[] {
  return items.filter((item) => item.id !== id)
}
