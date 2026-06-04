import type { ListView } from '../types'
import { IconGrid, IconList } from './icons'

interface Props {
  value: ListView
  onChange: (view: ListView) => void
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl border border-app bg-bar-800 p-1">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
        onClick={() => onChange('grid')}
        className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
          value === 'grid' ? 'bg-amber-accent text-bar-950' : 'text-muted'
        }`}
      >
        <IconGrid size={18} />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
          value === 'list' ? 'bg-amber-accent text-bar-950' : 'text-muted'
        }`}
      >
        <IconList size={18} />
      </button>
    </div>
  )
}
