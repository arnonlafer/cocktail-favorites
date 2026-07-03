import { Link, useLocation } from 'react-router-dom'
import { IconAi, IconCart, IconCollections, IconDraft, IconHome, IconSettings, IconStock } from './icons'

const tabs = [
  { to: '/', label: 'Home', Icon: IconHome, match: (path: string) => path === '/' },
  { to: '/collections', label: 'List', Icon: IconCollections, match: (path: string) => path.startsWith('/collections') },
  { to: '/draft', label: 'Draft', Icon: IconDraft, match: (path: string) => path === '/draft' },
  { to: '/cart', label: 'Cart', Icon: IconCart, match: (path: string) => path === '/cart' },
  { to: '/stock', label: 'Stock', Icon: IconStock, match: (path: string) => path === '/stock' || path.startsWith('/stock/') },
  { to: '/ai', label: 'AI', Icon: IconAi, match: (path: string) => path === '/ai' || path.startsWith('/ai/') },
  { to: '/settings', label: 'Settings', Icon: IconSettings, match: (path: string) => path.startsWith('/settings') },
] as const

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="app-shell fixed inset-x-0 bottom-0 z-30 mx-auto border-t border-app bg-bar-900/95 backdrop-blur pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <div className="flex">
        {tabs.map(({ to, label, Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium leading-none transition ${
                active ? 'text-amber-accent' : 'text-muted'
              }`}
            >
              <Icon size={20} className={active ? 'text-amber-accent' : 'text-muted'} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
