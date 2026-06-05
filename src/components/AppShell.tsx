import { useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

interface Props {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const { pathname } = useLocation()
  const showNav =
    pathname === '/' ||
    pathname === '/draft' ||
    pathname === '/cart' ||
    pathname.startsWith('/collections') ||
    pathname.startsWith('/settings')

  return (
    <>
      {children}
      {showNav && <BottomNav />}
    </>
  )
}
