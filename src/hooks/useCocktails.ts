import { useCallback, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import baseCocktails from '../data/cocktails.json'
import type { Cocktail } from '../types'
import {
  loadCustomCocktails,
  loadEdits,
  loadPrefs,
  saveCustomCocktails,
  saveCocktailEdit,
  savePrefs,
} from '../lib/storage'

function mergeCocktails(customCocktails: Cocktail[]): Cocktail[] {
  const edits = loadEdits()
  const customIds = new Set(customCocktails.map((c) => c.id))
  const base = (baseCocktails as Cocktail[])
    .filter((c) => !customIds.has(c.id))
    .map((c) => edits[c.id] ?? c)
  const custom = customCocktails.map((c) => edits[c.id] ?? c)
  return [...base, ...custom]
}

export function useCocktails() {
  const [customCocktails, setCustomCocktails] = useState<Cocktail[]>(() => loadCustomCocktails())
  const [dataVersion, setDataVersion] = useState(0)

  const cocktails = useMemo(
    () => mergeCocktails(customCocktails),
    [customCocktails, dataVersion],
  )

  const prefs = useMemo(() => loadPrefs(), [dataVersion])

  const fuse = useMemo(
    () =>
      new Fuse(cocktails, {
        keys: [
          { name: 'name', weight: 0.5 },
          { name: 'ingredients.name', weight: 0.35 },
          { name: 'spirits', weight: 0.15 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [cocktails],
  )

  const refresh = useCallback(() => setDataVersion((v) => v + 1), [])

  const addCocktail = useCallback(
    (cocktail: Cocktail) => {
      const next = [...customCocktails, cocktail]
      setCustomCocktails(next)
      saveCustomCocktails(next)
      refresh()
    },
    [customCocktails, refresh],
  )

  const saveCocktail = useCallback(
    (cocktail: Cocktail) => {
      if (cocktail.custom) {
        const idx = customCocktails.findIndex((c) => c.id === cocktail.id)
        if (idx >= 0) {
          const next = [...customCocktails]
          next[idx] = cocktail
          setCustomCocktails(next)
          saveCustomCocktails(next)
        } else {
          addCocktail(cocktail)
          return
        }
      } else {
        saveCocktailEdit(cocktail)
      }
      refresh()
    },
    [customCocktails, addCocktail, refresh],
  )

  const updatePrefs = useCallback(
    (partial: Partial<ReturnType<typeof loadPrefs>>) => {
      const current = loadPrefs()
      savePrefs({ ...current, ...partial })
      refresh()
    },
    [refresh],
  )

  const sortByRecent = useCallback(
    (items: Cocktail[]) => {
      const recent = loadPrefs().recentlyViewed
      return [...items].sort((a, b) => (recent[b.id] ?? 0) - (recent[a.id] ?? 0))
    },
    [dataVersion],
  )

  return {
    cocktails,
    prefs,
    fuse,
    addCocktail,
    saveCocktail,
    updatePrefs,
    sortByRecent,
    refreshPrefs: refresh,
  }
}
