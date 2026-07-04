import { useEffect } from 'react'
import { isDataDirty } from './dataStore'

export function confirmDiscardChanges(message = 'You have unsaved changes. Leave without saving?'): boolean {
  if (!isDataDirty()) return true
  return window.confirm(message)
}

export function useBeforeUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}
