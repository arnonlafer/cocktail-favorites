import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToTop } from '../lib/scroll'
import { BottomNav } from './BottomNav'

interface Props {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const { pathname } = useLocation()

  useEffect(() => {
    scrollToTop()
  }, [pathname])

  const showNav =
    pathname === '/' ||
    pathname === '/draft' ||
    pathname === '/cart' ||
    pathname.startsWith('/collections') ||
    pathname.startsWith('/settings')

  return (
    <>
      <div className={showNav ? 'pb-bottom-nav' : undefined}>{children}</div>
      {showNav && <BottomNav />}
    </>
  )
}
