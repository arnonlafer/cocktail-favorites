import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Collection } from '../types'
import {
  addCocktailToCollection,
  createCollection,
  loadCollections,
  removeCocktailFromCollection,
} from '../lib/storage'

interface Props {
  cocktailId: string
  collections: Collection[]
  onClose: () => void
  onChanged: () => void
}

export function CollectionPicker({ cocktailId, collections, onClose, onChanged }: Props) {
  const [items, setItems] = useState(collections)
  const [newName, setNewName] = useState('')

  useEffect(() => setItems(collections), [collections])

  const refresh = () => {
    setItems(loadCollections())
    onChanged()
  }

  const toggle = (collectionId: string, contains: boolean) => {
    if (contains) removeCocktailFromCollection(collectionId, cocktailId)
    else addCocktailToCollection(collectionId, cocktailId)
    refresh()
  }

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    const collection = createCollection(name)
    addCocktailToCollection(collection.id, cocktailId)
    setNewName('')
    refresh()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="max-h-[70dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-app bg-bar-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold text-foreground">Add to collection</h2>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New collection name…"
            className="min-w-0 flex-1 rounded-xl border border-app bg-bar-800 px-3 py-2 text-sm text-foreground placeholder:text-subtle"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="shrink-0 rounded-xl bg-amber-accent px-4 py-2 text-sm font-semibold text-bar-950 disabled:opacity-40"
          >
            Create
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mb-4 text-sm text-muted">No collections yet — create one above.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {items.map((collection) => {
              const contains = collection.cocktailIds.includes(cocktailId)
              return (
                <li key={collection.id}>
                  <button
                    type="button"
                    onClick={() => toggle(collection.id, contains)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                      contains ? 'border-amber-accent/50 bg-amber-accent/10' : 'border-app bg-bar-800'
                    }`}
                  >
                    <span className="font-medium text-foreground">{collection.name}</span>
                    <span className="text-sm text-amber-accent">{contains ? '✓' : '+'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-app py-2 text-sm text-muted"
        >
          Done
        </button>
      </section>
    </div>,
    document.body,
  )
}
