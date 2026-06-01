import { createPortal } from 'react-dom'
import type { Collection } from '../types'
import { addCocktailToCollection, removeCocktailFromCollection } from '../lib/storage'

interface Props {
  cocktailId: string
  collections: Collection[]
  onClose: () => void
  onChanged: () => void
}

export function CollectionPicker({ cocktailId, collections, onClose, onChanged }: Props) {
  const toggle = (collectionId: string, contains: boolean) => {
    if (contains) removeCocktailFromCollection(collectionId, cocktailId)
    else addCocktailToCollection(collectionId, cocktailId)
    onChanged()
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
        {collections.length === 0 ? (
          <p className="mb-4 text-sm text-muted">
            No collections yet. Create one in Settings → Collections.
          </p>
        ) : (
          <ul className="mb-4 space-y-2">
            {collections.map((collection) => {
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
