import { Link, useNavigate } from 'react-router-dom'
import type { FontSize, Theme } from '../types'
import { FONT_SIZE_LABELS, stepFontSize } from '../lib/theme'

interface Props {
  theme: Theme
  fontSize: FontSize
  onThemeChange: (theme: Theme) => void
  onFontSizeChange: (fontSize: FontSize) => void
}

export function SettingsPage({ theme, fontSize, onThemeChange, onFontSizeChange }: Props) {
  const navigate = useNavigate()

  return (
    <div className="safe-bottom pb-8">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-app bg-app/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="text-amber-accent">
          ← Back
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Settings</h1>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Font size</h2>
          <p className="mb-4 text-sm text-muted">Adjust text size across the app.</p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Decrease font size"
              onClick={() => onFontSizeChange(stepFontSize(fontSize, -1))}
              disabled={fontSize === 'sm'}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-app bg-bar-800 text-xl font-bold text-foreground disabled:opacity-30"
            >
              A−
            </button>
            <span className="min-w-24 text-center text-sm font-medium text-foreground">
              {FONT_SIZE_LABELS[fontSize]}
            </span>
            <button
              type="button"
              aria-label="Increase font size"
              onClick={() => onFontSizeChange(stepFontSize(fontSize, 1))}
              disabled={fontSize === 'xl'}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-app bg-bar-800 text-xl font-bold text-foreground disabled:opacity-30"
            >
              A+
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Theme</h2>
          <p className="mb-4 text-sm text-muted">Switch between dark and light appearance.</p>
          <div className="inline-flex w-full rounded-xl border border-app bg-bar-800 p-1">
            {(['dark', 'light'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onThemeChange(option)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition ${
                  theme === option ? 'bg-amber-accent text-bar-950' : 'text-muted'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <p className="px-1 text-xs text-subtle">
          Spirit groups collapse by default except the category of your last opened cocktail. Expand or
          collapse groups manually — your layout resets when you open a new recipe.
        </p>

        <Link to="/" className="block text-center text-sm text-amber-accent">
          Back to cocktails
        </Link>
      </div>
    </div>
  )
}
