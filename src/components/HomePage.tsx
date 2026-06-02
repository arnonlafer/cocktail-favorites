import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { AppPreferences, Cocktail, ListView } from '../types'
import { SPIRIT_ORDER } from '../types'
import { saveBrowseIds } from '../lib/browse'
import { computeCollapsedGroups } from '../lib/groups'
import { restoreHomeScroll, saveHomeScroll } from '../lib/scroll'
import { toggleFavorite } from '../lib/storage'
import { CocktailCard } from './CocktailCard'
import { CocktailGridCard } from './CocktailGridCard'
import { CollectionFilterPicker } from './CollectionFilterPicker'
import { SearchBar } from './SearchBar'
import type Fuse from 'fuse.js'

interface IconToggleProps {
  active: boolean
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}

function IconToggle({ active, onClick, ariaLabel, children }: IconToggleProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition ${
        active
          ? 'border-amber-accent bg-amber-accent/15 text-amber-light'
          : 'border-app-strong text-muted'
      }`}
    >
      {children}
    </button>
  )
}

interface Props {
  cocktails: Cocktail[]
  favorites: string[]
  prefs: AppPreferences
  fuse: Fuse<Cocktail>
  sortByRecent: (items: Cocktail[]) => Cocktail[]
  onFavoriteChange: () => void
  onUpdateCollapsedGroups: (collapsed: string[]) => void
  onListViewChange: (view: ListView) => void
}

export function HomePage({
  cocktails,
  favorites,
  prefs,
  fuse,
  sortByRecent,
  onFavoriteChange,
  onUpdateCollapsedGroups,
  onListViewChange,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const listView = prefs.listView ?? 'list'
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)

  useEffect(() => {
    restoreHomeScroll()
  }, [])

  const query = searchParams.get('q') ?? ''
  const favoritesOnly = searchParams.get('favorites') === '1'
  const collectionId = searchParams.get('collection')

  const activeCollection = useMemo(
    () => prefs.collections.find((c) => c.id === collectionId) ?? null,
    [prefs.collections, collectionId],
  )

  const selectCollection = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (id) next.set('collection', id)
          else next.delete('collection')
          return next
        },
        { replace: true },
      )
      setShowCollectionPicker(false)
    },
    [setSearchParams],
  )

  const setQuery = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value.trim()) next.set('q', value)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setFavoritesOnly = useCallback(
    (value: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set('favorites', '1')
          else next.delete('favorites')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const filtered = useMemo(() => {
    let items = query.trim() ? fuse.search(query.trim()).map((r) => r.item) : cocktails
    if (favoritesOnly) items = items.filter((c) => favorites.includes(c.id))
    if (activeCollection) {
      const ids = new Set(activeCollection.cocktailIds)
      items = items.filter((c) => ids.has(c.id))
    }
    return sortByRecent(items)
  }, [query, cocktails, fuse, favoritesOnly, favorites, activeCollection, sortByRecent])

  const grouped = useMemo(() => {
    if (query.trim() || favoritesOnly || activeCollection) return null

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
  }, [filtered, query, favoritesOnly, activeCollection])

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

  const openCocktail = useCallback(
    (cocktail: Cocktail, browseIds: string[]) => {
      saveHomeScroll()
      saveBrowseIds(browseIds)
      const search = searchParams.toString()
      navigate(`/cocktail/${cocktail.id}${search ? `?${search}` : ''}`, {
        state: { browseIds },
      })
    },
    [navigate, searchParams],
  )

  const renderCard = (cocktail: Cocktail, browseIds: string[]) => {
    const props = {
      key: cocktail.id,
      cocktail,
      isFavorite: favorites.includes(cocktail.id),
      onClick: () => openCocktail(cocktail, browseIds),
      onToggleFavorite: (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleFavorite(cocktail.id)
        onFavoriteChange()
      },
    }

    return listView === 'grid' ? <CocktailGridCard {...props} /> : <CocktailCard {...props} />
  }

  const renderList = (items: Cocktail[], browseIds: string[]) =>
    listView === 'grid' ? (
      <div className="grid grid-cols-2 gap-3">
        {items.map((cocktail) => renderCard(cocktail, browseIds))}
      </div>
    ) : (
      <div className="space-y-2">{items.map((cocktail) => renderCard(cocktail, browseIds))}</div>
    )

  const flatBrowseIds = useMemo(() => filtered.map((c) => c.id), [filtered])

  return (
    <div className="safe-bottom pb-24">
      <header className="sticky top-0 z-10 border-b border-app bg-app px-4 py-4 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Hi {prefs.userName.trim() || 'there'}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              aria-label="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-app text-lg text-muted"
            >
              ⚙
            </Link>
            <Link
              to="/draft"
              aria-label="Recipe draft"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-app text-lg text-muted"
            >
              📝
            </Link>
            <Link
              to="/add"
              className="rounded-xl bg-amber-accent px-3 py-2 text-sm font-semibold text-bar-950"
            >
              + Add
            </Link>
          </div>
        </div>
        <p className="mb-4 text-xs text-subtle">
          {activeCollection
            ? `${activeCollection.name} · ${filtered.length} recipe${filtered.length === 1 ? '' : 's'}`
            : filtered.length === cocktails.length
              ? `${cocktails.length} recipes · sorted by recently opened`
              : `${filtered.length} of ${cocktails.length} recipes`}
        </p>
        <SearchBar value={query} onChange={setQuery} />
        <div className="mt-3 flex items-center gap-2">
          <IconToggle
            active={favoritesOnly}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            ariaLabel={favoritesOnly ? 'Showing favorites only' : 'Show favorites only'}
          >
            {favoritesOnly ? '❤️' : '🤍'}
          </IconToggle>
          <IconToggle
            active={!!activeCollection}
            onClick={() => setShowCollectionPicker(true)}
            ariaLabel={
              activeCollection ? `Collection: ${activeCollection.name}` : 'Filter by collection'
            }
          >
            📁
          </IconToggle>
          <div className="ml-auto flex items-center gap-2">
            <IconToggle
              active={listView === 'list'}
              onClick={() => onListViewChange('list')}
              ariaLabel="List view"
            >
              ☰
            </IconToggle>
            <IconToggle
              active={listView === 'grid'}
              onClick={() => onListViewChange('grid')}
              ariaLabel="Thumbnail view"
            >
              ⊞
            </IconToggle>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-muted">No cocktails match your search.</p>
        ) : grouped ? (
          <div className="space-y-4">
            {grouped.map(({ spirit, cocktails: groupCocktails }) => {
              const isCollapsed = collapsedGroups.has(spirit)
              const groupBrowseIds = groupCocktails.map((c) => c.id)
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
                    <div className="border-t border-app px-3 pb-3 pt-2">
                      {renderList(groupCocktails, groupBrowseIds)}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        ) : (
          renderList(filtered, flatBrowseIds)
        )}
      </main>

      {showCollectionPicker && (
        <CollectionFilterPicker
          collections={prefs.collections}
          activeCollectionId={collectionId}
          onSelect={selectCollection}
          onClose={() => setShowCollectionPicker(false)}
        />
      )}
    </div>
  )
}
