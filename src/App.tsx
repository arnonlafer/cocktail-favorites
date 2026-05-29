import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useCocktails } from './hooks/useCocktails'
import { HomePage } from './components/HomePage'
import { CocktailDetailPage } from './components/CocktailDetailPage'
import { CocktailFormPage } from './components/CocktailFormPage'

export default function App() {
  const { cocktails, prefs, fuse, addCocktail, saveCocktail, updatePrefs, sortByRecent, refreshPrefs } =
    useCocktails()

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
                fuse={fuse}
                sortByRecent={sortByRecent}
                onFavoriteChange={refreshPrefs}
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
