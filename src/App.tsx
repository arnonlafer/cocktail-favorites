import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useCocktails } from './hooks/useCocktails'
import { validateSession } from './lib/auth'
import { isDataDirty } from './lib/dataStore'
import { loadLocalUiPrefs } from './lib/localPrefs'
import { loadFromServer } from './lib/serverSave'
import { loadPrefs, saveLocalAppearance, saveSyncCode } from './lib/storage'
import { normalizeStockCategory } from './lib/stock'
import { applyAppearance } from './lib/theme'
import { pullFromServer, subscribeSyncApplied } from './lib/sync'
import { AppShell } from './components/AppShell'
import { HomePage } from './components/HomePage'
import { CocktailDetailPage } from './components/CocktailDetailPage'
import { CocktailFormPage } from './components/CocktailFormPage'
import { CollectionsPage } from './components/CollectionsPage'
import { IngredientsPage } from './components/IngredientsPage'
import { LoginPage } from './components/LoginPage'
import { SettingsPage } from './components/SettingsPage'
import { DraftPage } from './components/DraftPage'
import { CartPage } from './components/CartPage'
import { StockPage } from './components/StockPage'
import { AiPage } from './components/AiPage'

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const {
    cocktails,
    prefs,
    fuse,
    saveCocktail,
    deleteCocktail,
    updatePrefs,
    sortByRecent,
    refreshPrefs,
  } = useCocktails()

  useEffect(() => {
    void validateSession().then((ok) => {
      setAuthenticated(ok)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    applyAppearance(prefs.theme, prefs.fontSize)
  }, [prefs.theme, prefs.fontSize])

  useEffect(() => subscribeSyncApplied(refreshPrefs), [refreshPrefs])

  useEffect(() => {
    if (!authenticated) return
    const code = loadPrefs().syncCode?.trim()
    if (!code) return

    const pull = () => {
      if (isDataDirty()) return
      void pullFromServer(code).then((status) => {
        if (status === 'synced') refreshPrefs()
      })
    }

    pull()

    const onPageShow = () => pull()
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [authenticated, refreshPrefs])

  useEffect(() => {
    if (!authenticated) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (isDataDirty()) return
      const code = loadPrefs().syncCode?.trim()
      if (!code) return
      void pullFromServer(code).then((status) => {
        if (status === 'synced') refreshPrefs()
      })
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [authenticated, refreshPrefs])

  if (!authReady) {
    return <div className="app-shell mx-auto min-h-dvh bg-bar-950" />
  }

  if (!authenticated) {
    return (
      <div className="app-shell mx-auto min-h-dvh bg-bar-950">
        <LoginPage
          onSuccess={() => {
            refreshPrefs()
            const ui = loadLocalUiPrefs()
            applyAppearance(ui.theme, ui.fontSize)
            setAuthenticated(true)
            void loadFromServer().then((status) => {
              if (status === 'synced') refreshPrefs()
            })
          }}
        />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppShell onServerSaved={refreshPrefs}>
        <div className="app-shell mx-auto min-h-dvh bg-bar-950">
          <Routes>
          <Route
            path="/"
            element={
              <HomePage
                cocktails={cocktails}
                favorites={prefs.favorites}
                prefs={prefs}
                fuse={fuse}
                sortByRecent={sortByRecent}
                onFavoriteChange={refreshPrefs}
                onUpdateCollapsedGroups={(collapsedGroups) => updatePrefs({ collapsedGroups })}
                onListViewChange={(listView) => updatePrefs({ listView })}
                onHomeGroupViewChange={(homeGroupView) => updatePrefs({ homeGroupView })}
                onCocktailSortChange={(cocktailSort) => updatePrefs({ cocktailSort })}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                theme={prefs.theme}
                fontSize={prefs.fontSize}
                syncCode={prefs.syncCode}
                lastSyncedAt={prefs.lastSyncedAt}
                randomFavoritesOnly={prefs.randomFavoritesOnly ?? true}
                cartSearchUrl={prefs.cartSearchUrl}
                onThemeChange={(theme) => {
                  saveLocalAppearance(theme, prefs.fontSize)
                  refreshPrefs()
                }}
                onFontSizeChange={(fontSize) => {
                  saveLocalAppearance(prefs.theme, fontSize)
                  refreshPrefs()
                }}
                onSyncCodeChange={(syncCode) => {
                  saveSyncCode(syncCode)
                  refreshPrefs()
                }}
                onRandomFavoritesOnlyChange={(randomFavoritesOnly) =>
                  updatePrefs({ randomFavoritesOnly })
                }
                onCartSearchUrlChange={(cartSearchUrl) => updatePrefs({ cartSearchUrl })}
                onReloaded={refreshPrefs}
                onLogout={() => setAuthenticated(false)}
              />
            }
          />
          <Route path="/settings/ingredients" element={<IngredientsPage onChanged={refreshPrefs} />} />
          <Route path="/collections" element={<CollectionsPage onChanged={refreshPrefs} />} />
          <Route path="/settings/collections" element={<CollectionsPage onChanged={refreshPrefs} />} />
          <Route
            path="/draft"
            element={
              <DraftPage
                draft={prefs.recipeDraft ?? ''}
                onSave={(recipeDraft) => updatePrefs({ recipeDraft })}
                onSaved={refreshPrefs}
              />
            }
          />
          <Route
            path="/cart"
            element={
              <CartPage
                items={prefs.cart ?? []}
                searchUrl={prefs.cartSearchUrl}
                onSave={(cart) => updatePrefs({ cart })}
                onSaved={refreshPrefs}
              />
            }
          />
          <Route
            path="/stock/:id?"
            element={
              <StockPage
                items={prefs.stock ?? []}
                lastCategory={normalizeStockCategory(prefs.lastStockCategory)}
                cart={prefs.cart ?? []}
                onSaveStock={(stock, lastStockCategory) => updatePrefs({ stock, lastStockCategory })}
                onAddToCart={(cart) => updatePrefs({ cart })}
                onSaved={refreshPrefs}
              />
            }
          />
          <Route path="/ai/:chatId?" element={<AiPage cocktails={cocktails} />} />
          <Route
            path="/cocktail/:id"
            element={
              <CocktailDetailPage
                cocktails={cocktails}
                favorites={prefs.favorites}
                collections={prefs.collections}
                unit={prefs.unit}
                multiplier={prefs.multiplier}
                randomFavoritesOnly={prefs.randomFavoritesOnly ?? true}
                onUnitChange={(unit) => updatePrefs({ unit })}
                onMultiplierChange={(multiplier) => updatePrefs({ multiplier })}
                onFavoriteChange={refreshPrefs}
                onViewed={refreshPrefs}
              />
            }
          />
          <Route
            path="/add"
            element={
              <CocktailFormPage
                cocktails={cocktails}
                onSave={saveCocktail}
                onSaved={refreshPrefs}
                mode="add"
              />
            }
          />
          <Route
            path="/cocktail/:id/edit"
            element={
              <CocktailFormPage
                cocktails={cocktails}
                onSave={saveCocktail}
                onDelete={deleteCocktail}
                onSaved={refreshPrefs}
                mode="edit"
              />
            }
          />
          </Routes>
        </div>
      </AppShell>
    </BrowserRouter>
  )
}

const ui = loadLocalUiPrefs()
applyAppearance(ui.theme, ui.fontSize)
