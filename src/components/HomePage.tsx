import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Cocktail } from '../types'
import { SPIRIT_ORDER } from '../types'
import { loadCollapsedGroups, saveCollapsedGroups, toggleFavorite } from '../lib/storage'
import { CocktailCard } from './CocktailCard'
import { SearchBar } from './SearchBar'
import type Fuse from 'fuse.js'

interface Props {
  cocktails: Cocktail[]
  favorites: string[]
  fuse: Fuse<Cocktail>
  sortByRecent: (items: Cocktail[]) => Cocktail[]
  onFavoriteChange: () => void
}

export function HomePage({ cocktails, favorites, fuse, sortByRecent, onFavoriteChange }: Props) {
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => loadCollapsedGroups())
  const navigate = useNavigate()

  const toggleGroup = (spirit: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(spirit)) next.delete(spirit)
      else next.add(spirit)
      saveCollapsedGroups(next)
      return next
    })
  }

  const filtered = useMemo(() => {
    let items = query.trim() ? fuse.search(query.trim()).map((r) => r.item) : cocktails
    if (favoritesOnly) items = items.filter((c) => favorites.includes(c.id))
    return sortByRecent(items)
  }, [query, cocktails, fuse, favoritesOnly, favorites, sortByRecent])

  const grouped = useMemo(() => {
    if (query.trim() || favoritesOnly) return null

    const map = new Map<string, Cocktail[]>()
    for (const spirit of SPIRIT_ORDER) map.set(spirit, [])

    for (const cocktail of filtered) {
      for (const spirit of cocktail.spirits) {
        if (!map.has(spirit)) map.set(spirit, [])
        const list = map.get(spirit)!
        if (!list.some((c) => c.id === cocktail.id)) list.push(cocktail)
      }
    }

    return SPIRIT_ORDER.filter((spirit) => (map.get(spirit)?.length ?? 0) > 0).map((spirit) => ({
      spirit,
      cocktails: map.get(spirit) ?? [],
    }))
  }, [filtered, query, favoritesOnly])

  const renderList = (items: Cocktail[]) => (
    <div className="space-y-2">
      {items.map((cocktail) => (
        <CocktailCard
          key={cocktail.id}
          cocktail={cocktail}
          isFavorite={favorites.includes(cocktail.id)}
          onClick={() => navigate(`/cocktail/${cocktail.id}`)}
          onToggleFavorite={(e) => {
            e.stopPropagation()
            toggleFavorite(cocktail.id)
            onFavoriteChange()
          }}
        />
      ))}
    </div>
  )

  return (
    <div className="safe-bottom pb-24">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-bar-950/95 px-4 py-4 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-white">Cocktail Favorites</h1>
          <Link
            to="/add"
            className="rounded-xl bg-amber-accent px-3 py-2 text-sm font-semibold text-bar-950"
          >
            + Add
          </Link>
        </div>
        <p className="mb-4 text-xs text-white/45">{cocktails.length} recipes · sorted by recently opened</p>
        <SearchBar value={query} onChange={setQuery} />
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            favoritesOnly
              ? 'border-amber-accent bg-amber-accent/15 text-amber-light'
              : 'border-white/15 text-white/60'
          }`}
        >
          {favoritesOnly ? '★ Favorites only' : '☆ Show favorites only'}
        </button>
      </header>

      <main className="px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-white/50">No cocktails match your search.</p>
        ) : grouped ? (
          <div className="space-y-4">
            {grouped.map(({ spirit, cocktails: groupCocktails }) => {
              const isCollapsed = collapsedGroups.has(spirit)
              return (
                <section key={spirit} className="rounded-2xl border border-white/8 bg-bar-900/40">
                  <button
                    type="button"
                    onClick={() => toggleGroup(spirit)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span
                      className={`text-sm text-amber-light/70 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      aria-hidden
                    >
                      ▸
                    </span>
                    <span className="flex-1 font-display text-xl text-amber-light">{spirit}</span>
                    <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs font-medium text-white/50">
                      {groupCocktails.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-2 border-t border-white/6 px-3 pb-3 pt-2">
                      {groupCocktails.map((cocktail) => (
                        <CocktailCard
                          key={cocktail.id}
                          cocktail={cocktail}
                          isFavorite={favorites.includes(cocktail.id)}
                          onClick={() => navigate(`/cocktail/${cocktail.id}`)}
                          onToggleFavorite={(e) => {
                            e.stopPropagation()
                            toggleFavorite(cocktail.id)
                            onFavoriteChange()
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        ) : (
          renderList(filtered)
        )}
      </main>
    </div>
  )
}
