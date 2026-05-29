import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useCocktails } from './hooks/useCocktails'
import { applyAppearance } from './lib/theme'
import { loadPrefs } from './lib/storage'
import { HomePage } from './components/HomePage'
import { CocktailDetailPage } from './components/CocktailDetailPage'
import { CocktailFormPage } from './components/CocktailFormPage'
import { SettingsPage } from './components/SettingsPage'

export default function App() {
  const { cocktails, prefs, fuse, addCocktail, saveCocktail, updatePrefs, sortByRecent, refreshPrefs } =
    useCocktails()

  useEffect(() => {
    applyAppearance(prefs.theme, prefs.fontSize)
  }, [prefs.theme, prefs.fontSize])

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
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                theme={prefs.theme}
                fontSize={prefs.fontSize}
                onThemeChange={(theme) => updatePrefs({ theme })}
                onFontSizeChange={(fontSize) => updatePrefs({ fontSize })}
              />
            }
          />
          <Route
            path="/cocktail/:id"
            element={
              <CocktailDetailPage
                cocktails={cocktails}
                favorites={prefs.favorites}
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
            element={<CocktailFormPage cocktails={cocktails} onSave={saveCocktail} mode="edit" />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

// Apply saved appearance before first paint
applyAppearance(loadPrefs().theme, loadPrefs().fontSize)
