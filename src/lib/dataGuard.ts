import { getDataState } from './dataStore'
import type { Collection, SyncPayload } from '../types'

export const LARGE_REMOVAL_THRESHOLD = 20

export interface RemovalSummary {
  stock: number
  cart: number
  lists: number
  recipes: number
  total: number
}

type GuardState = Omit<SyncPayload, 'syncCode'>

function countMissingById<T extends { id: string }>(before: T[], after: T[]): number {
  const afterIds = new Set(after.map((item) => item.id))
  return before.reduce((n, item) => n + (afterIds.has(item.id) ? 0 : 1), 0)
}

function recipeIds(state: GuardState): Set<string> {
  const ids = new Set<string>()
  for (const cocktail of state.custom ?? []) ids.add(cocktail.id)
  for (const id of Object.keys(state.edits ?? {})) ids.add(id)
  return ids
}

/** Baseline for loss checks — in-memory only (server is the durable source of truth). */
export function buildLossBaseline(memory: GuardState = getDataState()): GuardState {
  return memory
}

export function countRemovals(baseline: GuardState, next: GuardState): RemovalSummary {
  let stock = 0
  let cart = 0
  let lists = 0

  const baselineProfiles = baseline.userProfiles ?? {}
  const nextProfiles = next.userProfiles ?? {}
  for (const key of Object.keys(baselineProfiles)) {
    const before = baselineProfiles[key]
    const after = nextProfiles[key]
    if (!before) continue
    stock += countMissingById(before.stock ?? [], after?.stock ?? [])
    cart += countMissingById(before.cart ?? [], after?.cart ?? [])
    lists += countMissingById(
      (before.collections ?? []) as Collection[],
      (after?.collections ?? []) as Collection[],
    )
  }

  const beforeRecipes = recipeIds(baseline)
  const afterRecipes = recipeIds(next)
  let recipes = 0
  for (const id of beforeRecipes) {
    if (!afterRecipes.has(id)) recipes += 1
  }

  return {
    stock,
    cart,
    lists,
    recipes,
    total: stock + cart + lists + recipes,
  }
}

export function formatRemovalWarning(summary: RemovalSummary, actionLabel: string): string {
  const lines = [
    `${actionLabel} would remove a large amount of data:`,
    '',
    `• Stock: ${summary.stock}`,
    `• Cart: ${summary.cart}`,
    `• Lists: ${summary.lists}`,
    `• Recipes: ${summary.recipes}`,
    '',
    'Continue anyway? Cancel keeps your current data.',
  ]
  return lines.join('\n')
}

export function isLargeRemoval(summary: RemovalSummary): boolean {
  return summary.total > LARGE_REMOVAL_THRESHOLD
}

/** Returns true if the caller should proceed with the overwrite. */
export function confirmIfLargeLoss(
  baseline: GuardState,
  next: GuardState,
  actionLabel = 'This update',
): boolean {
  const summary = countRemovals(baseline, next)
  if (!isLargeRemoval(summary)) return true
  return window.confirm(formatRemovalWarning(summary, actionLabel))
}

export function countableScore(state: GuardState): number {
  let score =
    (state.custom?.length ?? 0) +
    Object.keys(state.edits ?? {}).length +
    (state.aiChats?.length ?? 0)
  for (const profile of Object.values(state.userProfiles ?? {})) {
    score +=
      (profile.stock?.length ?? 0) +
      (profile.cart?.length ?? 0) +
      (profile.collections?.length ?? 0)
  }
  return score
}
