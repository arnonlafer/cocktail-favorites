import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { createCartItem } from '../lib/cart'
import { describeSaveStatus, saveToServer } from '../lib/serverSave'
import {
  createStockItem,
  formatQuantityLeft,
  formatTotalQuantity,
  groupStockForList,
  isStockEmpty,
  markStockItemEmpty,
  normalizeStockCategory,
  removeStockItem,
  upsertStockItem,
  type StockListSection,
} from '../lib/stock'
import { runStockVoiceCommand } from '../lib/voiceCommands'
import { useVoiceCommand } from '../hooks/useVoiceCommand'
import type { CartItem, StockCategory, StockItem, StockListGroup } from '../types'
import {
  STOCK_CATEGORY_LABELS,
  STOCK_CATEGORY_ORDER,
  WHISKEY_SUBCATEGORIES,
  WHISKEY_SUBCATEGORY_LABELS,
} from '../types'
import { BarcodeScanButton, BarcodeScannerModal } from './BarcodeScannerModal'
import { PageHeader } from './PageHeader'
import { SearchBar } from './SearchBar'
import { VoiceCommandPanel, VoiceMicButton } from './VoiceCommandPanel'
import { IconCart, IconRanOut } from './icons'

interface Props {
  items: StockItem[]
  lastCategory: StockCategory
  cart: CartItem[]
  onSaveStock: (items: StockItem[], lastCategory: StockCategory) => void
  onAddToCart: (items: CartItem[]) => void
  onSaved: () => void
}

const primaryButtonClass =
  'w-full rounded-2xl bg-amber-accent py-3.5 text-base font-semibold text-bar-950 disabled:opacity-40'

const secondaryButtonClass =
  'w-full rounded-2xl border border-app-strong py-3.5 text-base font-semibold text-foreground'

const fieldClass =
  'w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-foreground outline-none focus:border-amber-accent/60'

const actionButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition disabled:opacity-30'

function StockItemRow({
  item,
  inCart,
  onMarkEmpty,
  onAddToCart,
}: {
  item: StockItem
  inCart: boolean
  onMarkEmpty: (id: string) => void
  onAddToCart: (name: string) => void
}) {
  const empty = isStockEmpty(item)

  return (
    <li className={`flex items-center gap-2 px-3 py-3 ${empty ? 'bg-red-950/25' : ''}`}>
      <Link to={`/stock/${item.id}`} className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${empty ? 'text-muted line-through decoration-red-300/60' : 'text-foreground'}`}
        >
          {item.name}
        </p>
        <p className={`mt-0.5 text-xs ${empty ? 'font-semibold text-red-300' : 'text-subtle'}`}>
          {empty ? (
            'Ran out'
          ) : (
            <>
              {item.open ? 'Open · ' : ''}
              {formatQuantityLeft(item.quantityLeft)}
            </>
          )}
        </p>
      </Link>
      {item.open && !empty && (
        <span className="shrink-0 rounded-full bg-amber-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-light">
          Open
        </span>
      )}
      {empty && (
        <span className="shrink-0 rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
          Empty
        </span>
      )}
      <button
        type="button"
        aria-label={`Mark ${item.name} as ran out`}
        disabled={empty}
        onClick={() => onMarkEmpty(item.id)}
        className={`${actionButtonClass} hover:border-red-400/40 hover:text-red-300`}
      >
        <IconRanOut size={18} />
      </button>
      <button
        type="button"
        aria-label={`Add ${item.name} to cart`}
        disabled={inCart}
        onClick={() => onAddToCart(item.name)}
        className={`${actionButtonClass} hover:text-amber-accent`}
      >
        <IconCart size={18} />
      </button>
    </li>
  )
}

function StockList({
  items,
  lastCategory,
  cart,
  onSaveStock,
  onAddToCart,
  onSaved,
}: Pick<Props, 'items' | 'lastCategory' | 'cart' | 'onSaveStock' | 'onAddToCart' | 'onSaved'>) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<StockListGroup>>(() => new Set())
  const [localItems, setLocalItems] = useState(items)
  const [syncedKey, setSyncedKey] = useState(() => JSON.stringify(items))
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [voicePending, setVoicePending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; message: string } | null>(null)
  const [scanning, setScanning] = useState(false)

  const incomingKey = JSON.stringify(items)
  if (!voicePending && incomingKey !== syncedKey) {
    setSyncedKey(incomingKey)
    setLocalItems(items)
  }

  const dirty = JSON.stringify(localItems) !== incomingKey
  const displayItems = voicePending ? localItems : items

  const voice = useVoiceCommand({
    items: displayItems,
    run: runStockVoiceCommand,
    onApplied: (nextItems, message, changed) => {
      setLocalItems(nextItems)
      setVerifyMessage(message)
      setSaveMessage(null)
      setVoicePending(changed || JSON.stringify(nextItems) !== JSON.stringify(items))
    },
  })

  const hasQuery = query.trim().length > 0
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return displayItems
    return displayItems.filter((item) => item.name.toLowerCase().includes(q))
  }, [displayItems, query])
  const grouped = useMemo(() => groupStockForList(filteredItems), [filteredItems])
  const cartNames = useMemo(() => new Set(cart.map((item) => item.name.toLowerCase())), [cart])
  // While searching, auto-expand every matching category so results are visible.
  const effectiveExpanded = useMemo(
    () => (hasQuery ? new Set(grouped.map(({ group }) => group)) : expanded),
    [hasQuery, grouped, expanded],
  )
  const allExpanded = grouped.length > 0 && grouped.every(({ group }) => effectiveExpanded.has(group))

  const toggleCategory = (group: StockListGroup) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const toggleAllCategories = () => {
    if (allExpanded) {
      setExpanded(new Set())
      return
    }
    setExpanded(new Set(grouped.map(({ group }) => group)))
  }

  const addItemToCart = (name: string) => {
    if (cartNames.has(name.toLowerCase())) return
    onAddToCart([...cart, createCartItem(name)])
    void saveToServer()
  }

  const markItemEmpty = (id: string) => {
    if (voicePending) {
      setLocalItems(markStockItemEmpty(localItems, id))
      setVerifyMessage(null)
      setSaveMessage(null)
      return
    }
    onSaveStock(markStockItemEmpty(items, id), lastCategory)
    void saveToServer()
  }

  const handleSaveVoiceChanges = async () => {
    setSaving(true)
    setSaveMessage(null)
    onSaveStock(localItems, lastCategory)
    try {
      const status = await saveToServer()
      const result = describeSaveStatus(status)
      setSaveMessage(result)
      if (result.ok) {
        setVoicePending(false)
        setSyncedKey(JSON.stringify(localItems))
        setVerifyMessage(null)
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  const discardVoiceChanges = () => {
    setLocalItems(items)
    setSyncedKey(incomingKey)
    setVoicePending(false)
    setVerifyMessage(null)
    setSaveMessage(null)
  }

  return (
    <div className="pb-page-end">
      <PageHeader title="Stock" confirmBack={voicePending && dirty}>
        <div className="flex items-center gap-2">
          <BarcodeScanButton
            disabled={voice.processing || saving || scanning}
            onClick={() => setScanning(true)}
          />
          <VoiceMicButton
            listening={voice.listening}
            disabled={voice.processing || saving || scanning}
            onClick={voice.toggleMic}
          />
          <Link to="/stock/new" className="text-sm font-semibold text-amber-accent">
            Add
          </Link>
        </div>
      </PageHeader>

      <BarcodeScannerModal
        open={scanning}
        onClose={() => setScanning(false)}
        onProduct={(product) => {
          navigate('/stock/new', { state: { prefillName: product.name } })
        }}
      />

      <div className="space-y-4 px-4 pt-4">
        <VoiceCommandPanel
          listening={voice.listening}
          processing={voice.processing}
          transcript={voice.transcript}
          heard={voice.heard}
          error={voice.error}
          verifyMessage={verifyMessage}
          canSave={voicePending && dirty}
          saving={saving}
          saveMessage={saveMessage}
          onSave={() => void handleSaveVoiceChanges()}
          onDiscard={voicePending ? discardVoiceChanges : undefined}
        />

        <SearchBar value={query} onChange={setQuery} placeholder="Search stock…" />

        {grouped.length > 0 && !hasQuery && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={toggleAllCategories}
              className="text-xs font-semibold text-amber-accent"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
        )}

        {displayItems.length === 0 ? (
          <p className="text-sm text-subtle">
            No stock yet. Tap <span className="text-amber-accent">Add</span> to track bottles and ingredients.
          </p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-subtle">No items match your search.</p>
        ) : (
          grouped.map((section) => (
            <StockListSection
              key={section.group}
              section={section}
              isExpanded={effectiveExpanded.has(section.group)}
              cartNames={cartNames}
              onToggle={() => toggleCategory(section.group)}
              onMarkEmpty={markItemEmpty}
              onAddToCart={addItemToCart}
            />
          ))
        )}
      </div>
    </div>
  )
}

function StockListSection({
  section,
  isExpanded,
  cartNames,
  onToggle,
  onMarkEmpty,
  onAddToCart,
}: {
  section: StockListSection
  isExpanded: boolean
  cartNames: Set<string>
  onToggle: () => void
  onMarkEmpty: (id: string) => void
  onAddToCart: (name: string) => void
}) {
  return (
    <section className="rounded-2xl border border-app bg-bar-900/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span
          className={`text-sm text-amber-light/70 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          aria-hidden
        >
          ▸
        </span>
        <span className="min-w-0 flex-1 font-display text-lg text-amber-light">
          {section.label}
          <span className="ml-2 text-sm font-sans font-medium text-subtle">
            {formatTotalQuantity(section.totalQuantity)} total
          </span>
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-subtle">
          {section.itemCount}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-app">
          {section.whiskeySubgroups ? (
            section.whiskeySubgroups.map((subgroup) => (
              <div key={subgroup.subcategory}>
                <div className="flex items-center gap-2 bg-bar-900/60 px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-light/80">
                    {subgroup.label}
                  </span>
                  <span className="text-xs text-subtle">{formatTotalQuantity(subgroup.totalQuantity)} total</span>
                </div>
                <ul className="divide-y divide-app">
                  {subgroup.items.map((item) => (
                    <StockItemRow
                      key={item.id}
                      item={item}
                      inCart={cartNames.has(item.name.toLowerCase())}
                      onMarkEmpty={onMarkEmpty}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <ul className="divide-y divide-app">
              {section.items.map((item) => (
                <StockItemRow
                  key={item.id}
                  item={item}
                  inCart={cartNames.has(item.name.toLowerCase())}
                  onMarkEmpty={onMarkEmpty}
                  onAddToCart={onAddToCart}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function StockItemEditor({
  items,
  itemId,
  mode,
  lastCategory,
  onSaveStock,
  onSaved,
}: {
  items: StockItem[]
  itemId?: string
  mode: 'add' | 'edit'
  lastCategory: StockCategory
  onSaveStock: (items: StockItem[], lastCategory: StockCategory) => void
  onSaved: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const existing = mode === 'edit' ? items.find((item) => item.id === itemId) : undefined
  const prefillName =
    mode === 'add'
      ? ((location.state as { prefillName?: string } | null)?.prefillName?.trim() ?? '')
      : ''

  const [name, setName] = useState(existing?.name ?? prefillName)
  const [category, setCategory] = useState<StockCategory>(
    existing ? normalizeStockCategory(existing.category) : lastCategory,
  )
  const [open, setOpen] = useState(existing?.open ?? false)
  const [quantityLeft, setQuantityLeft] = useState(String(existing?.quantityLeft ?? 1))
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; message: string } | null>(null)
  const [syncedItemId, setSyncedItemId] = useState(existing?.id)

  if (existing && existing.id !== syncedItemId) {
    setSyncedItemId(existing.id)
    setName(existing.name)
    setCategory(normalizeStockCategory(existing.category))
    setOpen(existing.open)
    setQuantityLeft(String(existing.quantityLeft))
  }

  const buildStockItem = (): StockItem | null => {
    const trimmedName = name.trim()
    if (!trimmedName) return null

    const parsedQty = Number(quantityLeft)
    const qty = Number.isFinite(parsedQty) ? Math.max(0, parsedQty) : 0

    return {
      id: existing?.id ?? createStockItem().id,
      name: trimmedName,
      category,
      open,
      quantityLeft: qty,
    }
  }

  const persistItem = (): StockItem | null => {
    const next = buildStockItem()
    if (!next) return null
    onSaveStock(upsertStockItem(items, next), category)
    return next
  }

  const uploadToServer = async (): Promise<boolean> => {
    setSaveMessage(null)
    setSaving(true)
    try {
      const status = await saveToServer()
      const result = describeSaveStatus(status)
      setSaveMessage(result)
      if (result.ok) onSaved()
      return result.ok
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!persistItem()) return
    const ok = await uploadToServer()
    if (ok) navigate('/stock')
  }

  const handleSaveAndAddNew = async () => {
    if (!persistItem()) return
    const ok = await uploadToServer()
    if (!ok) return
    if (mode === 'add') {
      setName('')
      setOpen(false)
      setQuantityLeft('1')
      return
    }
    navigate('/stock/new')
  }

  const handleDelete = async () => {
    if (!existing) {
      navigate('/stock')
      return
    }
    if (!window.confirm(`Delete "${existing.name}" from stock?`)) return
    onSaveStock(removeStockItem(items, existing.id), lastCategory)
    const ok = await uploadToServer()
    if (ok) navigate('/stock')
  }

  if (mode === 'edit' && itemId && !existing) {
    return (
      <div>
        <PageHeader title="Stock" backTo="/stock" />
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted">Item not found.</p>
        </div>
      </div>
    )
  }

  const parsedQty = Number(quantityLeft)
  const qty = Number.isFinite(parsedQty) ? Math.max(0, parsedQty) : 0
  const empty = isStockEmpty({ quantityLeft: qty })
  const canSave = name.trim().length > 0
  const isDirty =
    name.trim() !== (existing?.name ?? '') ||
    category !== (existing ? normalizeStockCategory(existing.category) : lastCategory) ||
    open !== (existing?.open ?? false) ||
    qty !== (existing?.quantityLeft ?? 1)

  return (
    <div className="pb-page-end">
      <PageHeader title={mode === 'add' ? 'Add Stock' : 'Edit Stock'} backTo="/stock" confirmBack={isDirty}>
        {existing && (
          <button type="button" onClick={handleDelete} className="text-sm font-semibold text-red-300">
            Delete
          </button>
        )}
      </PageHeader>

      <div className="space-y-5 px-4 pt-4">
        {empty && (
          <div className="rounded-2xl border border-red-400/30 bg-red-950/30 px-4 py-3">
            <p className="text-sm font-semibold text-red-300">Ran out</p>
            <p className="mt-0.5 text-xs text-red-200/70">Inventory is at zero. Restock by raising items left.</p>
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Name</span>
          <input
            className={`${fieldClass} ${empty ? 'text-muted line-through decoration-red-300/60' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bourbon, Campari, simple syrup…"
            autoFocus
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Category</span>
          <select
            className={fieldClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as StockCategory)}
          >
            <optgroup label="Whiskey">
              {WHISKEY_SUBCATEGORIES.map((sub) => {
                const value = `whiskey-${sub}` as StockCategory
                return (
                  <option key={value} value={value}>
                    {WHISKEY_SUBCATEGORY_LABELS[sub]}
                  </option>
                )
              })}
            </optgroup>
            {STOCK_CATEGORY_ORDER.filter((value) => !value.startsWith('whiskey-')).map((value) => (
              <option key={value} value={value}>
                {STOCK_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-app bg-bar-900/60 px-4 py-3">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            className="h-4 w-4 rounded border-app accent-amber-accent"
          />
          <span className="text-sm text-foreground">Bottle is open</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Items left</span>
          <input
            className={`${fieldClass} ${empty ? 'border-red-400/40 text-red-300' : ''}`}
            type="number"
            min={0}
            step={0.5}
            value={quantityLeft}
            onChange={(e) => setQuantityLeft(e.target.value)}
          />
        </label>

        {existing && !empty && (
          <button
            type="button"
            onClick={() => setQuantityLeft('0')}
            className="w-full rounded-2xl border border-red-400/30 py-3 text-sm font-semibold text-red-300"
          >
            Mark as ran out
          </button>
        )}

        {saveMessage && (
          <p
            className={`rounded-xl px-3 py-2 text-sm ${
              saveMessage.ok
                ? 'border border-emerald-900/40 bg-emerald-950/30 text-emerald-200'
                : 'border border-red-900/50 bg-red-950/40 text-red-200'
            }`}
          >
            {saveMessage.message}
          </p>
        )}

        <button type="button" onClick={() => void handleSave()} disabled={!canSave || saving} className={primaryButtonClass}>
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button
          type="button"
          onClick={() => void handleSaveAndAddNew()}
          disabled={!canSave || saving}
          className={secondaryButtonClass}
        >
          Save & Add New
        </button>

        {mode === 'add' && (
          <button
            type="button"
            onClick={() => navigate('/stock')}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export function StockPage({ items, lastCategory, cart, onSaveStock, onAddToCart, onSaved }: Props) {
  const { id } = useParams()

  if (id === 'new') {
    return (
      <StockItemEditor
        key="new"
        items={items}
        mode="add"
        lastCategory={lastCategory}
        onSaveStock={onSaveStock}
        onSaved={onSaved}
      />
    )
  }

  if (id) {
    return (
      <StockItemEditor
        key={id}
        items={items}
        itemId={id}
        mode="edit"
        lastCategory={lastCategory}
        onSaveStock={onSaveStock}
        onSaved={onSaved}
      />
    )
  }

  return (
    <StockList
      items={items}
      lastCategory={lastCategory}
      cart={cart}
      onSaveStock={onSaveStock}
      onAddToCart={onAddToCart}
      onSaved={onSaved}
    />
  )
}
