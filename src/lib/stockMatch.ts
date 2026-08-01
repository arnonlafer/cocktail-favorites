import type { StockItem } from '../types'

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Higher is more similar. 0 means not a useful match. */
export function stockNameSimilarity(a: string, b: string): number {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return 0
  if (left === right) return 100

  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length)
    const longer = Math.max(left.length, right.length)
    return 70 + Math.round((shorter / longer) * 20)
  }

  const leftTokens = left.split(' ').filter(Boolean)
  const rightTokens = right.split(' ').filter(Boolean)
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0

  let exact = 0
  let partial = 0
  for (const token of leftTokens) {
    if (rightTokens.includes(token)) {
      exact += 1
      continue
    }
    if (rightTokens.some((other) => other.includes(token) || token.includes(other))) {
      partial += 1
    }
  }

  const coverage = (exact + partial * 0.5) / Math.max(leftTokens.length, rightTokens.length)
  if (coverage < 0.34) return 0
  return Math.round(coverage * 65)
}

const MIN_SCORE = 34

/** Return the best matching stock items for a scanned product name. */
export function findSimilarStockItems(
  scannedName: string,
  items: StockItem[],
  limit = 5,
): StockItem[] {
  return items
    .map((item) => ({ item, score: stockNameSimilarity(scannedName, item.name) }))
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(({ item }) => item)
}
