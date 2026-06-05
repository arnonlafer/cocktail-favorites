import { useState } from 'react'
import type { CartItem } from '../types'
import { binnysSearchUrl, createCartItem } from '../lib/cart'
import { IconClose } from './icons'
import { PageHeader } from './PageHeader'

interface Props {
  items: CartItem[]
  onSave: (items: CartItem[]) => void
}

export function CartPage({ items, onSave }: Props) {
  const [draft, setDraft] = useState('')

  const addItem = () => {
    const name = draft.trim()
    if (!name) return
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setDraft('')
      return
    }
    onSave([...items, createCartItem(name)])
    setDraft('')
  }

  const removeItem = (id: string) => {
    onSave(items.filter((item) => item.id !== id))
  }

  const resetCart = () => {
    if (items.length === 0) return
    if (!window.confirm('Clear all items from your cart?')) return
    onSave([])
  }

  const fieldClass =
    'min-w-0 flex-1 rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-foreground outline-none focus:border-amber-accent/60'

  return (
    <div>
      <PageHeader title="Cart">
        <button
          type="button"
          disabled={items.length === 0}
          onClick={resetCart}
          className="text-sm font-semibold text-red-300 disabled:opacity-30"
        >
          Reset
        </button>
      </PageHeader>

      <div className="space-y-4 px-4 pt-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addItem()
          }}
        >
          <input
            className={fieldClass}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Bourbon, Campari, simple syrup…"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="shrink-0 rounded-xl bg-amber-accent px-4 py-2.5 text-sm font-semibold text-bar-950 disabled:opacity-40"
          >
            Add
          </button>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-subtle">Your cart is empty. Add bottles, syrups, or bitters you need.</p>
        ) : (
          <ul className="divide-y divide-app overflow-hidden rounded-2xl border border-app bg-bar-900/60">
            {items.map((item) => (
              <li key={item.id} className="flex items-stretch">
                <a
                  href={binnysSearchUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 px-4 py-3.5 text-sm text-foreground transition hover:bg-bar-800/80"
                >
                  {item.name}
                </a>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.id)}
                  className="flex w-12 shrink-0 items-center justify-center border-l border-app text-muted transition hover:bg-bar-800/80 hover:text-foreground"
                >
                  <IconClose size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <p className="text-xs text-subtle">Tap an item to search Binny&apos;s. Items sync with your account.</p>
        )}
      </div>
    </div>
  )
}
