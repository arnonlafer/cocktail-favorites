import type { CartItem } from '../types'

export function binnysSearchUrl(query: string): string {
  return `https://www.binnys.com/search/?query=${encodeURIComponent(query.trim())}`
}

export function createCartItem(name: string): CartItem {
  return {
    id: `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
  }
}
