import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Collection } from '../types'

interface Props {
  collections: Collection[]
  activeCollectionId: string | null
  onSelect: (collectionId: string | null) => void
  onClose: () => void
}

export function CollectionFilterPicker({
  collections,
  activeCollectionId,
  onSelect,
  onClose,
}: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-filter-title"
      onClick={onClose}
    >
      <section
        className="max-h-[70dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-app bg-bar-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="collection-filter-title" className="mb-3 text-base font-semibold text-foreground">
          Collections
        </h2>

        <ul className="mb-4 space-y-2">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                activeCollectionId == null
                  ? 'border-amber-accent/50 bg-amber-accent/10'
                  : 'border-app bg-bar-800'
              }`}
            >
              <span className="font-medium text-foreground">All recipes</span>
              {activeCollectionId == null && <span className="text-sm text-amber-accent">✓</span>}
            </button>
          </li>
          {collections.map((collection) => {
            const active = collection.id === activeCollectionId
            return (
              <li key={collection.id}>
                <button
                  type="button"
                  onClick={() => onSelect(collection.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                    active ? 'border-amber-accent/50 bg-amber-accent/10' : 'border-app bg-bar-800'
                  }`}
                >
                  <div>
                    <span className="font-medium text-foreground">{collection.name}</span>
                    <span className="ml-2 text-xs text-subtle">
                      {collection.cocktailIds.length} recipe
                      {collection.cocktailIds.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {active && <span className="text-sm text-amber-accent">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {collections.length === 0 && (
          <p className="mb-4 text-sm text-muted">
            No collections yet.{' '}
            <Link to="/collections" className="text-amber-accent" onClick={onClose}>
              Create one in Settings
            </Link>
          </p>
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
