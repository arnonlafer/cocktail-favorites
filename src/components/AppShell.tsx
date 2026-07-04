import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isDataDirty, subscribeDataDirty } from '../lib/dataStore'
import { scrollToTop } from '../lib/scroll'
import { saveToServer } from '../lib/serverSave'
import { useBeforeUnloadGuard } from '../lib/unsavedChanges'
import { BottomNav } from './BottomNav'

interface Props {
  children: React.ReactNode
  onServerSaved: () => void
}

export function AppShell({ children, onServerSaved }: Props) {
  const { pathname } = useLocation()
  const [dirty, setDirty] = useState(isDataDirty())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    scrollToTop()
  }, [pathname])

  useEffect(() => subscribeDataDirty(() => setDirty(isDataDirty())), [])

  useBeforeUnloadGuard(dirty)

  const showNav =
    pathname === '/' ||
    pathname === '/draft' ||
    pathname === '/cart' ||
    pathname === '/stock' ||
    pathname.startsWith('/stock/') ||
    pathname === '/ai' ||
    pathname.startsWith('/ai/') ||
    pathname.startsWith('/collections') ||
    pathname.startsWith('/settings') ||
    (pathname.startsWith('/cocktail/') && !pathname.endsWith('/edit'))

  const handleSaveToServer = () => {
    setSaving(true)
    void saveToServer().then(() => {
      setSaving(false)
      onServerSaved()
    })
  }

  return (
    <>
      {dirty && (
        <div className="sticky top-0 z-20 border-b border-amber-accent/30 bg-amber-950/90 px-4 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-amber-light">Unsaved changes</p>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveToServer}
              className="shrink-0 rounded-lg bg-amber-accent px-3 py-1.5 text-xs font-semibold text-bar-950 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save to server'}
            </button>
          </div>
        </div>
      )}
      <div className={showNav ? 'pb-bottom-nav' : undefined}>{children}</div>
      {showNav && <BottomNav />}
    </>
  )
}
