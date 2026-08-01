import type { CartItem, StockCategory, StockItem } from '../types'
import { STOCK_CATEGORY_LABELS, STOCK_CATEGORY_ORDER } from '../types'
import { sendAiMessage } from './aiApi'
import { createAiMessage, loadAiSettings } from './aiStorage'
import { createCartItem } from './cart'
import {
  createStockItem,
  normalizeStockCategory,
  removeStockItem,
  upsertStockItem,
} from './stock'

export type VoiceCommandTarget = 'stock' | 'cart'

export interface VoiceCommandResult<T> {
  message: string
  nextItems: T[]
  changed: boolean
}

type StockOp =
  | {
      action: 'add'
      name?: string
      category?: string
      open?: boolean
      quantityLeft?: number
    }
  | {
      action: 'remove'
      id?: string
      match?: string
    }
  | {
      action: 'update'
      id?: string
      match?: string
      open?: boolean
      quantityLeft?: number
      name?: string
      category?: string
    }

type CartOp =
  | { action: 'add'; name?: string }
  | { action: 'remove'; id?: string; match?: string }

interface AiCommandPayload {
  message?: string
  ops?: unknown[]
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ')
}

function findByIdOrMatch<T extends { id: string; name: string }>(
  items: T[],
  id?: string,
  match?: string,
): T | undefined {
  if (id) {
    const byId = items.find((item) => item.id === id)
    if (byId) return byId
  }
  const needle = match?.trim()
  if (!needle) return undefined
  const normalized = normalizeName(needle)
  return (
    items.find((item) => normalizeName(item.name) === normalized) ??
    items.find((item) => normalizeName(item.name).includes(normalized)) ??
    items.find((item) => normalized.includes(normalizeName(item.name)))
  )
}

function extractJsonObject(text: string): AiCommandPayload {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || text.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('AI returned an unreadable response. Try again.')
  }
  return JSON.parse(candidate.slice(start, end + 1)) as AiCommandPayload
}

function formatStockInventory(items: StockItem[]): string {
  if (items.length === 0) return '(empty)'
  return items
    .map(
      (item) =>
        `- id=${item.id} | ${item.name} | category=${item.category} | open=${item.open} | quantityLeft=${item.quantityLeft}`,
    )
    .join('\n')
}

function formatCartInventory(items: CartItem[]): string {
  if (items.length === 0) return '(empty)'
  return items.map((item) => `- id=${item.id} | ${item.name}`).join('\n')
}

function categoryListForPrompt(): string {
  return STOCK_CATEGORY_ORDER.map((id) => `${id} (${STOCK_CATEGORY_LABELS[id]})`).join(', ')
}

function buildStockSystemPrompt(items: StockItem[]): string {
  return `You interpret spoken commands that edit a home bar STOCK inventory.

Return ONLY a JSON object (no markdown) with this shape:
{"message":"short verification for the user","ops":[...]}

Stock ops:
- {"action":"add","name":"...","category":"<StockCategory>","open":false,"quantityLeft":1}
- {"action":"remove","id":"..."} or {"action":"remove","match":"name fragment"}
- {"action":"update","id":"...","open":true} and/or "quantityLeft", optional "name"/"category"
  Prefer id when the item exists. Use match only if id is unknown.

Semantics:
- "remove" / "delete" → remove the item from stock
- "ran out" / "empty" → update quantityLeft to 0 (do not remove)
- "opened" / "open bottle" → update open to true
- "add" a bottle → add with quantityLeft 1 and open false unless said otherwise
- Infer category from the bottle type using allowed categories
- If nothing matches / nothing to change, return ops: [] and explain in message

Allowed categories: ${categoryListForPrompt()}

Current stock:
${formatStockInventory(items)}`
}

function buildCartSystemPrompt(items: CartItem[]): string {
  return `You interpret spoken commands that edit a shopping CART for bar ingredients.

Return ONLY a JSON object (no markdown) with this shape:
{"message":"short verification for the user","ops":[...]}

Cart ops:
- {"action":"add","name":"..."}
- {"action":"remove","id":"..."} or {"action":"remove","match":"name fragment"}

Semantics:
- Add items the user wants to buy
- Remove items they no longer need
- Do not add duplicates (case-insensitive)
- If nothing matches / nothing to change, return ops: [] and explain in message

Current cart:
${formatCartInventory(items)}`
}

function applyStockOps(items: StockItem[], ops: StockOp[]): { next: StockItem[]; changed: boolean } {
  let next = [...items]
  let changed = false

  for (const op of ops) {
    if (op.action === 'add') {
      const name = op.name?.trim()
      if (!name) continue
      if (next.some((item) => normalizeName(item.name) === normalizeName(name))) continue
      const qty =
        typeof op.quantityLeft === 'number' && Number.isFinite(op.quantityLeft)
          ? Math.max(0, op.quantityLeft)
          : 1
      next = upsertStockItem(
        next,
        createStockItem({
          name,
          category: normalizeStockCategory(op.category) as StockCategory,
          open: Boolean(op.open),
          quantityLeft: qty,
        }),
      )
      changed = true
      continue
    }

    if (op.action === 'remove') {
      const found = findByIdOrMatch(next, op.id, op.match)
      if (!found) continue
      next = removeStockItem(next, found.id)
      changed = true
      continue
    }

    if (op.action === 'update') {
      const found = findByIdOrMatch(next, op.id, op.match)
      if (!found) continue
      const updated: StockItem = {
        ...found,
        name: op.name?.trim() || found.name,
        category: op.category ? normalizeStockCategory(op.category) : found.category,
        open: typeof op.open === 'boolean' ? op.open : found.open,
        quantityLeft:
          typeof op.quantityLeft === 'number' && Number.isFinite(op.quantityLeft)
            ? Math.max(0, op.quantityLeft)
            : found.quantityLeft,
      }
      if (
        updated.name === found.name &&
        updated.category === found.category &&
        updated.open === found.open &&
        updated.quantityLeft === found.quantityLeft
      ) {
        continue
      }
      next = upsertStockItem(next, updated)
      changed = true
    }
  }

  return { next, changed }
}

function applyCartOps(items: CartItem[], ops: CartOp[]): { next: CartItem[]; changed: boolean } {
  let next = [...items]
  let changed = false

  for (const op of ops) {
    if (op.action === 'add') {
      const name = op.name?.trim()
      if (!name) continue
      if (next.some((item) => normalizeName(item.name) === normalizeName(name))) continue
      next = [...next, createCartItem(name)]
      changed = true
      continue
    }

    if (op.action === 'remove') {
      const found = findByIdOrMatch(next, op.id, op.match)
      if (!found) continue
      next = next.filter((item) => item.id !== found.id)
      changed = true
    }
  }

  return { next, changed }
}

function asStockOps(raw: unknown[] | undefined): StockOp[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((op): op is StockOp => {
    if (!op || typeof op !== 'object') return false
    const action = (op as { action?: string }).action
    return action === 'add' || action === 'remove' || action === 'update'
  })
}

function asCartOps(raw: unknown[] | undefined): CartOp[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((op): op is CartOp => {
    if (!op || typeof op !== 'object') return false
    const action = (op as { action?: string }).action
    return action === 'add' || action === 'remove'
  })
}

export async function runStockVoiceCommand(
  transcript: string,
  items: StockItem[],
): Promise<VoiceCommandResult<StockItem>> {
  const settings = loadAiSettings()
  const reply = await sendAiMessage(settings, [createAiMessage('user', transcript.trim())], {
    systemPrompt: buildStockSystemPrompt(items),
  })
  const payload = extractJsonObject(reply)
  const { next, changed } = applyStockOps(items, asStockOps(payload.ops))
  const message =
    payload.message?.trim() ||
    (changed ? 'Stock updated. Save to keep these changes.' : 'Nothing was changed.')
  return { message, nextItems: next, changed }
}

export async function runCartVoiceCommand(
  transcript: string,
  items: CartItem[],
): Promise<VoiceCommandResult<CartItem>> {
  const settings = loadAiSettings()
  const reply = await sendAiMessage(settings, [createAiMessage('user', transcript.trim())], {
    systemPrompt: buildCartSystemPrompt(items),
  })
  const payload = extractJsonObject(reply)
  const { next, changed } = applyCartOps(items, asCartOps(payload.ops))
  const message =
    payload.message?.trim() ||
    (changed ? 'Cart updated. Save to keep these changes.' : 'Nothing was changed.')
  return { message, nextItems: next, changed }
}
