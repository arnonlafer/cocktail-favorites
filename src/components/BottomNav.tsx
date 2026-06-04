import { Link, useLocation } from 'react-router-dom'
import { IconCollections, IconDraft, IconHome, IconSettings } from './icons'

const tabs = [
  { to: '/', label: 'Home', Icon: IconHome, match: (path: string) => path === '/' },
  { to: '/collections', label: 'Collections', Icon: IconCollections, match: (path: string) => path.startsWith('/collections') },
  { to: '/draft', label: 'Draft', Icon: IconDraft, match: (path: string) => path === '/draft' },
  { to: '/settings', label: 'Settings', Icon: IconSettings, match: (path: string) => path.startsWith('/settings') },
] as const

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-app bg-bar-900/95 backdrop-blur pb-[max(0.25rem,env(safe-area-inset-bottom))]">
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
