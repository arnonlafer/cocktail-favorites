import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createCartItem } from '../lib/cart'
import {
  createStockItem,
  formatQuantityLeft,
  groupStockByCategory,
  removeStockItem,
  upsertStockItem,
} from '../lib/stock'
import type { CartItem, StockCategory, StockItem } from '../types'
import { STOCK_CATEGORY_LABELS, STOCK_CATEGORY_ORDER } from '../types'
import { PageHeader } from './PageHeader'
import { SearchBar } from './SearchBar'
import { IconCart } from './icons'

interface Props {
  items: StockItem[]
  lastCategory: StockCategory
  cart: CartItem[]
  onSaveStock: (items: StockItem[], lastCategory: StockCategory) => void
  onAddToCart: (items: CartItem[]) => void
}

const fieldClass =
  'w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-foreground outline-none focus:border-amber-accent/60'

function StockList({ items, cart, onAddToCart }: Pick<Props, 'items' | 'cart' | 'onAddToCart'>) {
  const [query, setQuery] = useState('')
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.name.toLowerCase().includes(q))
  }, [items, query])
  const grouped = useMemo(() => groupStockByCategory(filteredItems), [filteredItems])
  const cartNames = useMemo(() => new Set(cart.map((item) => item.name.toLowerCase())), [cart])

  const addItemToCart = (name: string) => {
    if (cartNames.has(name.toLowerCase())) return
    onAddToCart([...cart, createCartItem(name)])
  }

  return (
    <div>
      <PageHeader title="Stock">
        <Link to="/stock/new" className="text-sm font-semibold text-amber-accent">
          Add
        </Link>
      </PageHeader>

      <div className="space-y-4 px-4 pt-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search stock…" />

        {items.length === 0 ? (
          <p className="text-sm text-subtle">
            No stock yet. Tap <span className="text-amber-accent">Add</span> to track bottles and ingredients.
          </p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-subtle">No items match your search.</p>
        ) : (
          grouped.map(({ category, items: groupItems }) => (
            <section key={category}>
              <h2 className="mb-2 text-sm font-semibold text-amber-light">{STOCK_CATEGORY_LABELS[category]}</h2>
              <ul className="divide-y divide-app overflow-hidden rounded-2xl border border-app bg-bar-900/60">
                {groupItems.map((item) => {
                  const inCart = cartNames.has(item.name.toLowerCase())
                  return (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-3">
                      <Link to={`/stock/${item.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <p className="mt-0.5 text-xs text-subtle">
                          {item.open ? 'Open · ' : ''}
                          {formatQuantityLeft(item.quantityLeft)}
                        </p>
                      </Link>
                      {item.open && (
                        <span className="shrink-0 rounded-full bg-amber-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-light">
                          Open
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Add ${item.name} to cart`}
                        disabled={inCart}
                        onClick={() => addItemToCart(item.name)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition hover:text-amber-accent disabled:opacity-30"
                      >
                        <IconCart size={18} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function StockItemEditor({
  items,
  itemId,
  mode,
  lastCategory,
  onSaveStock,
}: {
  items: StockItem[]
  itemId?: string
  mode: 'add' | 'edit'
  lastCategory: StockCategory
  onSaveStock: (items: StockItem[], lastCategory: StockCategory) => void
}) {
  const navigate = useNavigate()
  const existing = mode === 'edit' ? items.find((item) => item.id === itemId) : undefined
  const createdIdRef = useRef<string | null>(null)
  const navigatedRef = useRef(false)

  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState<StockCategory>(existing?.category ?? lastCategory)
  const [open, setOpen] = useState(existing?.open ?? false)
  const [quantityLeft, setQuantityLeft] = useState(String(existing?.quantityLeft ?? 1))

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setCategory(existing.category)
    setOpen(existing.open)
    setQuantityLeft(String(existing.quantityLeft))
  }, [existing?.id])

  useEffect(() => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    const parsedQty = Number(quantityLeft)
    const qty = Number.isFinite(parsedQty) ? Math.max(0, parsedQty) : 0
    let id = existing?.id ?? createdIdRef.current
    if (!id) {
      id = createStockItem().id
      createdIdRef.current = id
    }

    const next: StockItem = {
      id,
      name: trimmedName,
      category,
      open,
      quantityLeft: qty,
    }

    const timer = window.setTimeout(() => {
      onSaveStock(upsertStockItem(items, next), category)
      if (mode === 'add' && id && !navigatedRef.current) {
        navigatedRef.current = true
        navigate(`/stock/${id}`, { replace: true })
      }
    }, 600)

    return () => window.clearTimeout(timer)
  }, [name, category, open, quantityLeft, existing, items, mode, navigate, onSaveStock])

  const handleDelete = () => {
    if (!existing) {
      navigate('/stock')
      return
    }
    if (!window.confirm(`Delete "${existing.name}" from stock?`)) return
    onSaveStock(removeStockItem(items, existing.id), lastCategory)
    navigate('/stock')
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

  return (
    <div className="pb-page-end">
      <PageHeader title={mode === 'add' ? 'Add Stock' : 'Edit Stock'} backTo="/stock">
        <div className="flex shrink-0 items-center gap-3">
          {existing && (
            <Link to="/stock/new" className="text-sm font-semibold text-amber-accent">
              Add
            </Link>
          )}
          {existing && (
            <button type="button" onClick={handleDelete} className="text-sm font-semibold text-red-300">
              Delete
            </button>
          )}
        </div>
      </PageHeader>

      <div className="space-y-5 px-4 pt-4">
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Name</span>
          <input
            className={fieldClass}
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
            {STOCK_CATEGORY_ORDER.map((value) => (
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
            className={fieldClass}
            type="number"
            min={0}
            step={0.5}
            value={quantityLeft}
            onChange={(e) => setQuantityLeft(e.target.value)}
          />
        </label>

        {!existing && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-2xl border border-app-strong py-3 text-sm font-semibold text-muted"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export function StockPage({ items, lastCategory, cart, onSaveStock, onAddToCart }: Props) {
  const { id } = useParams()

  if (id === 'new') {
    return (
      <StockItemEditor
        key="new"
        items={items}
        mode="add"
        lastCategory={lastCategory}
        onSaveStock={onSaveStock}
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
      />
    )
  }

  return <StockList items={items} cart={cart} onAddToCart={onAddToCart} />
}
