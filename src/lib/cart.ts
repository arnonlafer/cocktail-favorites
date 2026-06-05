import type { CartItem } from '../types'

export const DEFAULT_CART_SEARCH_URL = 'https://www.binnys.com/search/?query={query}'

export function cartItemUrl(template: string | undefined, query: string): string {
  const encoded = encodeURIComponent(query.trim())
  const url = template?.trim() || DEFAULT_CART_SEARCH_URL
  if (url.includes('{query}')) {
    return url.replaceAll('{query}', encoded)
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}query=${encoded}`
}

export function createCartItem(name: string): CartItem {
  return {
    id: `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
  }
}
