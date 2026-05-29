import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AppPreferences, Cocktail } from '../types'
import { SPIRIT_ORDER } from '../types'
import { computeCollapsedGroups } from '../lib/groups'
import { toggleFavorite } from '../lib/storage'
import { CocktailCard } from './CocktailCard'
import { SearchBar } from './SearchBar'
import type Fuse from 'fuse.js'

interface Props {
  cocktails: Cocktail[]
  favorites: string[]
  prefs: AppPreferences
  fuse: Fuse<Cocktail>
  sortByRecent: (items: Cocktail[]) => Cocktail[]
  onFavoriteChange: () => void
  onUpdateCollapsedGroups: (collapsed: string[]) => void
}

export function HomePage({
  cocktails,
  favorites,
  prefs,
  fuse,
  sortByRecent,
  onFavoriteChange,
  onUpdateCollapsedGroups,
}: Props) {
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const navigate = useNavigate()

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

  const visibleSpirits = useMemo(() => grouped?.map((g) => g.spirit) ?? [], [grouped])

  const collapsedGroups = useMemo(
    () => computeCollapsedGroups(prefs, cocktails, visibleSpirits),
    [prefs, cocktails, visibleSpirits],
  )

  const toggleGroup = (spirit: string) => {
    const next = new Set(collapsedGroups)
    if (next.has(spirit)) next.delete(spirit)
    else next.add(spirit)
    onUpdateCollapsedGroups([...next])
  }

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
      <header className="sticky top-0 z-10 border-b border-app bg-app px-4 py-4 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Cocktail Favorites</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              aria-label="Settings"
              className="rounded-xl border border-app px-3 py-2 text-sm font-medium text-muted"
            >
              ⚙
            </Link>
            <Link
              to="/add"
              className="rounded-xl bg-amber-accent px-3 py-2 text-sm font-semibold text-bar-950"
            >
              + Add
            </Link>
          </div>
        </div>
        <p className="mb-4 text-xs text-subtle">{cocktails.length} recipes · sorted by recently opened</p>
        <SearchBar value={query} onChange={setQuery} />
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            favoritesOnly
              ? 'border-amber-accent bg-amber-accent/15 text-amber-light'
              : 'border-app-strong text-muted'
          }`}
        >
          {favoritesOnly ? '★ Favorites only' : '☆ Show favorites only'}
        </button>
      </header>

      <main className="px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-muted">No cocktails match your search.</p>
        ) : grouped ? (
          <div className="space-y-4">
            {grouped.map(({ spirit, cocktails: groupCocktails }) => {
              const isCollapsed = collapsedGroups.has(spirit)
              return (
                <section key={spirit} className="rounded-2xl border border-app bg-bar-900/40">
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
                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-subtle">
                      {groupCocktails.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-2 border-t border-app px-3 pb-3 pt-2">
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
