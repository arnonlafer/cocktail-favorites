import { useCallback, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { AppPreferences, Cocktail, CocktailSort, HomeGroupView, ListView } from '../types'
import { SPIRIT_ORDER } from '../types'
import { saveBrowseIds } from '../lib/browse'
import { computeCollapsedGroups } from '../lib/groups'
import { restoreHomeScroll, saveHomeScroll } from '../lib/scroll'
import { toggleFavorite } from '../lib/storage'
import { CocktailCard } from './CocktailCard'
import { CocktailGridCard } from './CocktailGridCard'
import { SearchBar } from './SearchBar'
import { ViewToggle } from './ViewToggle'
import { IconClock, IconHeart, IconLayers, IconList, IconPlus, IconShuffle, IconSortAlpha } from './icons'
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
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
        active
          ? 'border-amber-accent bg-amber-accent/15 text-amber-accent'
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
  onHomeGroupViewChange: (view: HomeGroupView) => void
  onCocktailSortChange: (sort: CocktailSort) => void
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
  onHomeGroupViewChange,
  onCocktailSortChange,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const listView = prefs.listView ?? 'list'
  const homeGroupView = prefs.homeGroupView ?? 'spirits'
  const cocktailSort = prefs.cocktailSort ?? 'recent'

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
    if (cocktailSort === 'alphabetical') {
      return [...items].sort((a, b) => a.name.localeCompare(b.name))
    }
    return sortByRecent(items)
  }, [query, cocktails, fuse, favoritesOnly, favorites, activeCollection, cocktailSort, sortByRecent])

  const grouped = useMemo(() => {
    if (query.trim() || favoritesOnly || activeCollection || homeGroupView === 'all') return null

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
  }, [filtered, query, favoritesOnly, activeCollection, homeGroupView])

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((cocktail) => renderCard(cocktail, browseIds))}
      </div>
    ) : (
      <div className="space-y-2">{items.map((cocktail) => renderCard(cocktail, browseIds))}</div>
    )

  const openRandom = useCallback(() => {
    const favoritesOnly = prefs.randomFavoritesOnly ?? true
    let pool = favoritesOnly ? cocktails.filter((c) => favorites.includes(c.id)) : cocktails
    if (pool.length === 0) pool = cocktails
    if (pool.length === 0) return
    const pick = pool[Math.floor(Math.random() * pool.length)]!
    const browseIds = pool.map((c) => c.id)
    openCocktail(pick, browseIds)
  }, [cocktails, favorites, prefs.randomFavoritesOnly, openCocktail])

  const flatBrowseIds = useMemo(() => filtered.map((c) => c.id), [filtered])

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-app bg-app px-4 py-4 backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/" className="shrink-0">
            <img src="/icon-header.png" alt="" className="h-10 w-10" />
          </Link>
          <h1 className="min-w-0 flex-1 font-display text-xl font-bold text-foreground">
            Hi {prefs.userName.trim() || 'there'}
          </h1>
          <button
            type="button"
            aria-label="Open random recipe"
            onClick={openRandom}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-strong text-muted"
          >
            <IconShuffle size={20} />
          </button>
          <Link
            to="/add"
            aria-label="Add cocktail"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-accent text-bar-950"
          >
            <IconPlus size={20} />
          </Link>
        </div>
        <SearchBar value={query} onChange={setQuery} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <IconToggle
            active={favoritesOnly}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            ariaLabel={favoritesOnly ? 'Showing favorites only' : 'Show favorites only'}
          >
            <IconHeart filled={favoritesOnly} size={20} />
          </IconToggle>
          {!query.trim() && !favoritesOnly && !activeCollection && (
            <div className="inline-flex rounded-xl border border-app bg-bar-800 p-1">
              <button
                type="button"
                aria-label="Group by spirit"
                aria-pressed={homeGroupView === 'spirits'}
                onClick={() => onHomeGroupViewChange('spirits')}
                className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
                  homeGroupView === 'spirits' ? 'bg-amber-accent text-bar-950' : 'text-muted'
                }`}
              >
                <IconLayers size={18} />
              </button>
              <button
                type="button"
                aria-label="Show all recipes"
                aria-pressed={homeGroupView === 'all'}
                onClick={() => onHomeGroupViewChange('all')}
                className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
                  homeGroupView === 'all' ? 'bg-amber-accent text-bar-950' : 'text-muted'
                }`}
              >
                <IconList size={18} />
              </button>
            </div>
          )}
          <div className="inline-flex rounded-xl border border-app bg-bar-800 p-1">
            <button
              type="button"
              aria-label="Sort by recently opened"
              aria-pressed={cocktailSort === 'recent'}
              onClick={() => onCocktailSortChange('recent')}
              className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
                cocktailSort === 'recent' ? 'bg-amber-accent text-bar-950' : 'text-muted'
              }`}
            >
              <IconClock size={18} />
            </button>
            <button
              type="button"
              aria-label="Sort alphabetically"
              aria-pressed={cocktailSort === 'alphabetical'}
              onClick={() => onCocktailSortChange('alphabetical')}
              className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
                cocktailSort === 'alphabetical' ? 'bg-amber-accent text-bar-950' : 'text-muted'
              }`}
            >
              <IconSortAlpha size={18} />
            </button>
          </div>
          <ViewToggle value={listView} onChange={onListViewChange} />
          <p className="ml-auto text-xs text-subtle">
            {activeCollection
              ? `${activeCollection.name} · ${filtered.length}`
              : filtered.length === cocktails.length
                ? `${cocktails.length} recipes`
                : `${filtered.length} of ${cocktails.length}`}
          </p>
        </div>
      </header>

      <main className="px-4 pt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-muted">No cocktails match your search.</p>
        ) : grouped ? (
          <div
            className={
              listView === 'list'
                ? 'space-y-4 lg:flex lg:flex-wrap lg:items-start lg:gap-4 lg:space-y-0'
                : 'space-y-4'
            }
          >
            {grouped.map(({ spirit, cocktails: groupCocktails }) => {
              const isCollapsed = collapsedGroups.has(spirit)
              const groupBrowseIds = groupCocktails.map((c) => c.id)
              return (
                <section
                  key={spirit}
                  className={`rounded-2xl border border-app bg-bar-900/40 ${
                    listView === 'list' ? 'lg:min-w-[min(100%,17rem)] lg:flex-1 lg:basis-72' : ''
                  }`}
                >
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
    </div>
  )
}
