import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { IngredientNutrition } from '../types'
import { getAllNutritionEntries } from '../lib/nutrition'
import { deleteNutritionEntry, loadNutritionOverrides, upsertNutritionEntry } from '../lib/storage'

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

  const saveEntry = () => {
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
  }

  const removeEntry = (id: string) => {
    deleteNutritionEntry(id)
    setEditing(null)
    refresh()
  }

  const hasOverride = (id: string) => loadNutritionOverrides().some((e) => e.id === id)

  return (
    <div className="safe-bottom pb-8">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-app bg-app/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="text-amber-accent">
          ← Back
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Ingredient Nutrition</h1>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <p className="text-sm text-muted">
          Calories and carbs per fluid ounce. Used to estimate totals for each cocktail.
        </p>

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

        {editing && (
          <section className="rounded-2xl border border-amber-accent/40 bg-bar-900/80 p-4">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              {isNew ? 'New ingredient' : 'Edit ingredient'}
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
                  onClick={saveEntry}
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
                  onClick={() => removeEntry(editing.id)}
                  className="w-full rounded-xl border border-red-900/50 py-2 text-sm text-red-300"
                >
                  {editing.custom ? 'Delete custom entry' : 'Reset to default'}
                </button>
              )}
            </div>
          </section>
        )}

        <div className="space-y-2">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => startEdit(entry)}
              className="flex w-full items-center justify-between rounded-2xl border border-app bg-bar-900/60 px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium text-foreground">{entry.name}</p>
                <p className="text-xs text-subtle">
                  {entry.caloriesPerOz} cal/oz · {entry.carbsPerOz}g carbs/oz
                  {entry.custom ? ' · custom' : ''}
                </p>
              </div>
              <span className="text-amber-accent">Edit</span>
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
    </div>
  )
}
