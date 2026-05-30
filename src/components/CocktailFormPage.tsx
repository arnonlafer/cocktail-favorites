import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Cocktail, Ingredient } from '../types'
import {
  GLASS_OPTIONS,
  ICE_OPTIONS,
  METHOD_OPTIONS,
  SPIRIT_OPTIONS,
} from '../types'

interface Props {
  cocktails: Cocktail[]
  onSave: (cocktail: Cocktail) => void
  onDelete?: (id: string) => void
  mode: 'add' | 'edit'
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36)
  )
}

function parseIngredientLine(line: string): Ingredient {
  const trimmed = line.trim()
  const match = trimmed.match(/^([\d./\s]+)\s*(oz|ml|dash(?:es)?|pinch|tsp|tbsp)?\s*(.+)$/i)
  if (!match) return { amount: null, unit: null, name: trimmed }
  const [, amountRaw, unitRaw, name] = match
  let amount = 0
  for (const part of amountRaw.trim().split(/\s+/)) {
    if (part.includes('/')) {
      const [a, b] = part.split('/').map(Number)
      amount += a / b
    } else amount += Number(part)
  }
  const unit = unitRaw?.toLowerCase() ?? null
  const normalizedUnit = unit === 'oz' || unit?.startsWith('dash') ? (unit.startsWith('dash') ? 'dash' : 'oz') : unit
  return { amount: Number.isFinite(amount) ? amount : null, unit: normalizedUnit, name: name.trim() }
}

function ingredientsToText(ingredients: Ingredient[]): string {
  return ingredients
    .map((ing) => {
      if (ing.amount != null && ing.unit) return `${ing.amount} ${ing.unit} ${ing.name}`
      return ing.name
    })
    .join('\n')
}

export function CocktailFormPage({ cocktails, onSave, onDelete, mode }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = mode === 'edit' ? cocktails.find((c) => c.id === id) : undefined

  const [name, setName] = useState('')
  const [method, setMethod] = useState('Shaken')
  const [glass, setGlass] = useState('Coupe')
  const [ice, setIce] = useState('None')
  const [spirits, setSpirits] = useState<string[]>(['Other'])
  const [garnish, setGarnish] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [instructionsText, setInstructionsText] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setMethod(existing.method)
    setGlass(existing.glass)
    setIce(existing.ice)
    setSpirits(existing.spirits)
    setGarnish(existing.garnish ?? '')
    setIngredientsText(ingredientsToText(existing.ingredients))
    setInstructionsText(existing.instructions.join('\n'))
    setImageUrl(existing.imageUrl ?? '')
  }, [existing])

  const toggleSpirit = (spirit: string) => {
    setSpirits((prev) => {
      if (prev.includes(spirit)) return prev.length > 1 ? prev.filter((s) => s !== spirit) : prev
      return [...prev, spirit]
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const ingredients = ingredientsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map(parseIngredientLine)

    const instructions = instructionsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 4)

    const cocktail: Cocktail = {
      id: existing?.id ?? slugify(name),
      name: name.trim(),
      method,
      glass,
      ice,
      spirits,
      ingredients,
      garnish: garnish.trim() || null,
      instructions: instructions.length ? instructions : ['Combine and serve.'],
      imageUrl: imageUrl.trim() || null,
      custom: existing?.custom ?? mode === 'add',
    }

    onSave(cocktail)
    if (mode === 'edit') {
      navigate(-1)
    } else {
      navigate(`/cocktail/${cocktail.id}`)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-foreground outline-none focus:border-amber-accent/60'

  return (
    <div className="safe-bottom pb-8">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-app bg-app px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="text-amber-accent">
          ← Cancel
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">
          {mode === 'edit' ? 'Edit Cocktail' : 'Add Cocktail'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 pt-4">
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Name *</span>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">Method</span>
            <select className={fieldClass} value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">Glass</span>
            <select className={fieldClass} value={glass} onChange={(e) => setGlass(e.target.value)}>
              {GLASS_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">Ice</span>
            <select className={fieldClass} value={ice} onChange={(e) => setIce(e.target.value)}>
              {ICE_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="mb-2 block text-sm text-muted">Main spirits</span>
          <div className="flex flex-wrap gap-2">
            {SPIRIT_OPTIONS.map((spirit) => (
              <button
                key={spirit}
                type="button"
                onClick={() => toggleSpirit(spirit)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  spirits.includes(spirit)
                    ? 'border-amber-accent bg-amber-accent/20 text-amber-light'
                    : 'border-app-strong text-muted'
                }`}
              >
                {spirit}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Image URL (optional)</span>
          <input
            className={fieldClass}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Ingredients (one per line, amounts in oz)</span>
          <textarea
            className={`${fieldClass} min-h-32 font-mono text-sm`}
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder={'1.5 oz blanco tequila\n0.5 oz campari\n0.5 oz cynar'}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Garnish</span>
          <input
            className={fieldClass}
            value={garnish}
            onChange={(e) => setGarnish(e.target.value)}
            placeholder="Lemon twist, orange peel…"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Instructions (2–4 steps, one per line)</span>
          <textarea
            className={`${fieldClass} min-h-28`}
            value={instructionsText}
            onChange={(e) => setInstructionsText(e.target.value)}
            placeholder={'Combine all ingredients in a shaker with ice.\nShake until well chilled.\nStrain into a chilled coupe.'}
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-amber-accent py-3.5 text-base font-semibold text-bar-950"
        >
          {mode === 'edit' ? 'Save Changes' : 'Save Cocktail'}
        </button>

        {mode === 'edit' && existing && onDelete && (
          <button
            type="button"
            className="w-full rounded-2xl border border-red-900/60 py-3.5 text-base font-semibold text-red-300"
            onClick={() => {
              if (!window.confirm(`Delete "${existing.name}"? This cannot be undone.`)) return
              onDelete(existing.id)
              navigate('/')
            }}
          >
            Delete Cocktail
          </button>
        )}
      </form>
    </div>
  )
}
