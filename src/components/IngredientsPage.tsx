import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import type { IngredientNutrition } from '../types'
import { getAllNutritionEntries } from '../lib/nutrition'
import { deleteNutritionEntry, loadNutritionOverrides, loadPrefs, upsertNutritionEntry } from '../lib/storage'
import { subscribeSyncApplied, syncNow, type SyncStatus } from '../lib/sync'

interface Props {
  onChanged: () => void
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function IngredientsPage({ onChanged }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState<IngredientNutrition | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  const entries = useMemo(() => getAllNutritionEntries(), [version])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.aliases?.some((a) => a.toLowerCase().includes(q)),
    )
  }, [entries, query])

  useEffect(() => subscribeSyncApplied(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    if (!editing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editing])

  const refresh = () => {
    setVersion((v) => v + 1)
    onChanged()
  }

  const startAdd = () => {
    setEditing({
      id: `custom-${Date.now()}`,
      name: '',
      caloriesPerOz: 64,
      carbsPerOz: 0,
      aliases: [],
      custom: true,
    })
    setIsNew(true)
  }

  const startEdit = (entry: IngredientNutrition) => {
    setEditing({ ...entry, aliases: [...(entry.aliases ?? [])] })
    setIsNew(false)
  }

  const pushSync = async () => {
    const code = loadPrefs().syncCode?.trim()
    if (!code) {
      setSyncStatus('not-configured')
      return
    }
    setSyncStatus('syncing')
    const status = await syncNow(code)
    setSyncStatus(status)
    if (status === 'synced') refresh()
  }

  const saveEntry = async () => {
    if (!editing || !editing.name.trim()) return
    const entry: IngredientNutrition = {
      ...editing,
      id: isNew ? slugify(editing.name) || editing.id : editing.id,
      name: editing.name.trim(),
      aliases: editing.aliases?.map((a) => a.trim()).filter(Boolean) ?? [],
      custom: isNew ? true : editing.custom,
    }
    upsertNutritionEntry(entry)
    setEditing(null)
    refresh()
    await pushSync()
  }

  const removeEntry = async (id: string) => {
    deleteNutritionEntry(id)
    setEditing(null)
    refresh()
    await pushSync()
  }

  const hasOverride = (id: string) => loadNutritionOverrides().some((e) => e.id === id)

  const editDialog =
    editing &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingredient-edit-title"
        onClick={() => setEditing(null)}
      >
        <section
          className="max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-accent/40 bg-bar-900 p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="ingredient-edit-title" className="mb-3 text-base font-semibold text-foreground">
            {isNew ? 'New ingredient' : `Edit ${editing.name}`}
          </h2>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-subtle">Name</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full rounded-xl border border-app bg-bar-800 px-3 py-2 text-sm text-foreground"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-subtle">Calories / oz</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editing.caloriesPerOz}
                  onChange={(e) =>
                    setEditing({ ...editing, caloriesPerOz: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-app bg-bar-800 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-subtle">Carbs / oz (g)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={editing.carbsPerOz}
                  onChange={(e) =>
                    setEditing({ ...editing, carbsPerOz: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-app bg-bar-800 px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-subtle">
                Aliases (comma-separated, for matching recipe names)
              </span>
              <input
                value={(editing.aliases ?? []).join(', ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    aliases: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                placeholder="e.g. blanco tequila, tequila blanco"
                className="w-full rounded-xl border border-app bg-bar-800 px-3 py-2 text-sm text-foreground"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void saveEntry()}
                className="flex-1 rounded-xl bg-amber-accent py-2 text-sm font-semibold text-bar-950"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl border border-app py-2 text-sm text-muted"
              >
                Cancel
              </button>
            </div>
            {!isNew && (editing.custom || hasOverride(editing.id)) && (
              <button
                type="button"
                onClick={() => void removeEntry(editing.id)}
                className="w-full rounded-xl border border-red-900/50 py-2 text-sm text-red-300"
              >
                {editing.custom ? 'Delete custom entry' : 'Reset to default'}
              </button>
            )}
          </div>
        </section>
      </div>,
      document.body,
    )

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-app bg-app/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="text-amber-accent">
          ← Back
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Ingredient Nutrition</h1>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <p className="text-sm text-muted">
          Calories and carbs per fluid ounce. Used to estimate totals for each cocktail. Changes sync
          automatically when a sync code is set.
        </p>

        {syncStatus === 'syncing' && <p className="text-xs text-subtle">Syncing…</p>}
        {syncStatus === 'synced' && <p className="text-xs text-emerald-300">Saved and synced.</p>}
        {syncStatus === 'not-configured' && (
          <p className="text-xs text-amber-light/80">Saved locally. Add a sync code in Settings to sync.</p>
        )}
        {syncStatus === 'error' && <p className="text-xs text-red-300">Saved locally, but sync failed.</p>}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ingredients…"
          className="w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-sm text-foreground placeholder:text-subtle"
        />

        <button
          type="button"
          onClick={startAdd}
          className="w-full rounded-xl bg-amber-accent py-2.5 text-sm font-semibold text-bar-950"
        >
          + Add ingredient
        </button>

        <div className="space-y-2">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => startEdit(entry)}
              className="flex w-full items-center justify-between rounded-2xl border border-app bg-bar-900/60 px-4 py-3 text-left active:bg-bar-800"
            >
              <div>
                <p className="font-medium text-foreground">{entry.name}</p>
                <p className="text-xs text-subtle">
                  {entry.caloriesPerOz} cal/oz · {entry.carbsPerOz}g carbs/oz
                  {entry.custom ? ' · custom' : ''}
                  {hasOverride(entry.id) && !entry.custom ? ' · edited' : ''}
                </p>
              </div>
              <span className="shrink-0 text-amber-accent">Edit</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No ingredients match your search.</p>
        )}

        <Link to="/settings" className="block text-center text-sm text-amber-accent">
          Back to settings
        </Link>
      </div>

      {editDialog}
    </div>
  )
}
