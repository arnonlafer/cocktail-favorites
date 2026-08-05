import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Collection } from '../types'
import {
  createCollection,
  deleteCollection,
  loadCollections,
  renameCollection,
} from '../lib/storage'
import { describeSaveStatus, saveToServer } from '../lib/serverSave'
import { PageHeader } from './PageHeader'
import { IconEdit, IconTrash } from './icons'

interface Props {
  onChanged: () => void
}

const iconBtnClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition hover:text-foreground'

export function CollectionsPage({ onChanged }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const backTo = location.pathname.startsWith('/settings') ? '/settings' : '/'
  const [collections, setCollections] = useState<Collection[]>(() => loadCollections())
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; message: string } | null>(null)

  const refresh = () => {
    setCollections(loadCollections())
    onChanged()
  }

  /** Lists live in the synced profile, so every edit is pushed right away. */
  const persist = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      setSaveMessage(describeSaveStatus(await saveToServer()))
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    createCollection(name)
    setNewName('')
    refresh()
    await persist()
  }

  const handleRename = async (id: string) => {
    const name = editName.trim()
    if (!name) return
    renameCollection(id, name)
    setEditingId(null)
    refresh()
    await persist()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this list?')) return
    deleteCollection(id)
    refresh()
    await persist()
  }

  const openCollection = (id: string) => {
    navigate(`/?collection=${id}`)
  }

  return (
    <div>
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
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || saving}
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
                    disabled={saving}
                    onClick={() => void handleRename(collection.id)}
                    className="text-sm text-amber-accent disabled:opacity-40"
                  >
                    {saving ? 'Saving…' : 'Save'}
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCollection(collection.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-foreground">{collection.name}</p>
                    <p className="text-xs text-subtle">
                      {collection.cocktailIds.length} recipe
                      {collection.cocktailIds.length === 1 ? '' : 's'}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Rename ${collection.name}`}
                    onClick={() => {
                      setEditingId(collection.id)
                      setEditName(collection.name)
                    }}
                    className={iconBtnClass}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${collection.name}`}
                    onClick={() => void handleDelete(collection.id)}
                    className={`${iconBtnClass} hover:text-red-300`}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {collections.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No lists yet.</p>
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
          disabled={saving}
          onClick={() => void persist()}
          className="mt-6 w-full rounded-xl border border-app-strong bg-surface py-3 text-sm font-medium text-primary disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save to server'}
        </button>
      </div>
    </div>
  )
}
