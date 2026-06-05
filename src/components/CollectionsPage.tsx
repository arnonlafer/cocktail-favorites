import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Collection } from '../types'
import {
  createCollection,
  deleteCollection,
  loadCollections,
  renameCollection,
} from '../lib/storage'
import { PageHeader } from './PageHeader'

interface Props {
  onChanged: () => void
}

export function CollectionsPage({ onChanged }: Props) {
  const location = useLocation()
  const backTo = location.pathname.startsWith('/settings') ? '/settings' : '/'
  const [collections, setCollections] = useState<Collection[]>(() => loadCollections())
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const refresh = () => {
    setCollections(loadCollections())
    onChanged()
  }

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    createCollection(name)
    setNewName('')
    refresh()
  }

  const handleRename = (id: string) => {
    const name = editName.trim()
    if (!name) return
    renameCollection(id, name)
    setEditingId(null)
    refresh()
  }

  const handleDelete = (id: string) => {
    deleteCollection(id)
    refresh()
  }

  return (
    <div className="safe-bottom pb-[3.5rem]">
      <PageHeader title="Lists" backTo={backTo} />

      <div className="space-y-4 px-4 pt-4">
        <p className="text-sm text-muted">
          Group recipes into lists. Add cocktails from any recipe page.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New list name…"
            className="min-w-0 flex-1 rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="shrink-0 rounded-xl bg-amber-accent px-4 py-2.5 text-sm font-semibold text-bar-950 disabled:opacity-40"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="rounded-2xl border border-app bg-bar-900/60 px-4 py-3"
            >
              {editingId === collection.id ? (
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-app bg-bar-800 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(collection.id)}
                    className="text-sm text-amber-accent"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-sm text-muted"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{collection.name}</p>
                    <p className="text-xs text-subtle">
                      {collection.cocktailIds.length} recipe
                      {collection.cocktailIds.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <Link
                      to={`/?collection=${collection.id}`}
                      className="text-sm text-amber-accent"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(collection.id)
                        setEditName(collection.name)
                      }}
                      className="text-sm text-muted"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(collection.id)}
                      className="text-sm text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {collections.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No lists yet.</p>
        )}
      </div>
    </div>
  )
}
