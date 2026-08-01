import { useEffect, useState } from 'react'
import type { CartItem } from '../types'
import { cartItemUrl, createCartItem } from '../lib/cart'
import { describeSaveStatus, saveToServer } from '../lib/serverSave'
import { IconClose } from './icons'
import { PageHeader } from './PageHeader'

interface Props {
  items: CartItem[]
  searchUrl: string
  onSave: (items: CartItem[]) => void
  onSaved: () => void
}

export function CartPage({ items, searchUrl, onSave, onSaved }: Props) {
  const [draft, setDraft] = useState('')
  const [localItems, setLocalItems] = useState(items)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const addItem = () => {
    const name = draft.trim()
    if (!name) return
    if (localItems.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setDraft('')
      return
    }
    setLocalItems([...localItems, createCartItem(name)])
    setDraft('')
    setSaveMessage(null)
  }

  const removeItem = (id: string) => {
    setLocalItems(localItems.filter((item) => item.id !== id))
    setSaveMessage(null)
  }

  const resetCart = () => {
    if (localItems.length === 0) return
    if (!window.confirm('Clear all items from your cart?')) return
    setLocalItems([])
    setSaveMessage(null)
  }

  const handleSave = async () => {
    setSaveMessage(null)
    setSaving(true)
    onSave(localItems)
    try {
      const status = await saveToServer()
      const result = describeSaveStatus(status)
      setSaveMessage(result)
      if (result.ok) onSaved()
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'min-w-0 flex-1 rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-foreground outline-none focus:border-amber-accent/60'

  return (
    <div className="pb-page-end">
      <PageHeader title="Cart" confirmBack={JSON.stringify(localItems) !== JSON.stringify(items)}>
        <button
          type="button"
          disabled={localItems.length === 0}
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

        {localItems.length === 0 ? (
          <p className="text-sm text-subtle">Your cart is empty. Add bottles, syrups, or bitters you need.</p>
        ) : (
          <ul className="divide-y divide-app overflow-hidden rounded-2xl border border-app bg-bar-900/60">
            {localItems.map((item) => (
              <li key={item.id} className="flex items-stretch">
                <a
                  href={cartItemUrl(searchUrl, item.name)}
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

        <button
          type="button"
          disabled={saving || JSON.stringify(localItems) === JSON.stringify(items)}
          onClick={() => void handleSave()}
          className="w-full rounded-2xl bg-amber-accent py-3.5 text-base font-semibold text-bar-950 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save to server'}
        </button>
      </div>
    </div>
  )
}
