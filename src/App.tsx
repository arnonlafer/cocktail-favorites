import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useCocktails } from './hooks/useCocktails'
import { validateSession } from './lib/auth'
import { applyAppearance } from './lib/theme'
import { loadPrefs } from './lib/storage'
import { pullSync, subscribeSyncApplied } from './lib/sync'
import { HomePage } from './components/HomePage'
import { CocktailDetailPage } from './components/CocktailDetailPage'
import { CocktailFormPage } from './components/CocktailFormPage'
import { CollectionsPage } from './components/CollectionsPage'
import { IngredientsPage } from './components/IngredientsPage'
import { LoginPage } from './components/LoginPage'
import { SettingsPage } from './components/SettingsPage'

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const {
    cocktails,
    prefs,
    fuse,
    addCocktail,
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
      void pullSync(code).then((status) => {
        if (status === 'synced') refreshPrefs()
      })
    }

    pull()

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) pull()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [authenticated, refreshPrefs])

  useEffect(() => {
    if (!authenticated) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const code = loadPrefs().syncCode?.trim()
      if (!code) return
      void pullSync(code).then((status) => {
        if (status === 'synced') refreshPrefs()
      })
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [authenticated, refreshPrefs])

  if (!authReady) {
    return <div className="mx-auto min-h-dvh max-w-lg bg-bar-950" />
  }

  if (!authenticated) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg bg-bar-950">
        <LoginPage
          onSuccess={() => {
            refreshPrefs()
            const p = loadPrefs()
            applyAppearance(p.theme, p.fontSize)
            setAuthenticated(true)
          }}
        />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="mx-auto min-h-dvh max-w-lg bg-bar-950">
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
                onThemeChange={(theme) => updatePrefs({ theme })}
                onFontSizeChange={(fontSize) => updatePrefs({ fontSize })}
                onSyncCodeChange={(syncCode) => updatePrefs({ syncCode })}
                onSynced={refreshPrefs}
                onLogout={() => setAuthenticated(false)}
              />
            }
          />
          <Route path="/settings/ingredients" element={<IngredientsPage onChanged={refreshPrefs} />} />
          <Route path="/settings/collections" element={<CollectionsPage onChanged={refreshPrefs} />} />
          <Route
            path="/cocktail/:id"
            element={
              <CocktailDetailPage
                cocktails={cocktails}
                favorites={prefs.favorites}
                collections={prefs.collections}
                unit={prefs.unit}
                multiplier={prefs.multiplier}
                onUnitChange={(unit) => updatePrefs({ unit })}
                onMultiplierChange={(multiplier) => updatePrefs({ multiplier })}
                onFavoriteChange={refreshPrefs}
                onViewed={refreshPrefs}
              />
            }
          />
          <Route path="/add" element={<CocktailFormPage cocktails={cocktails} onSave={addCocktail} mode="add" />} />
          <Route
            path="/cocktail/:id/edit"
            element={
              <CocktailFormPage
                cocktails={cocktails}
                onSave={saveCocktail}
                onDelete={deleteCocktail}
                mode="edit"
              />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

// Apply saved appearance before first paint
applyAppearance(loadPrefs().theme, loadPrefs().fontSize)
