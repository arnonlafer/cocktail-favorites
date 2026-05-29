import type { UnitSystem } from '../types'

interface Props {
  unit: UnitSystem
  multiplier: number
  onUnitChange: (unit: UnitSystem) => void
  onMultiplierChange: (multiplier: number) => void
}

const MULTIPLIERS = [0.5, 1, 2, 3, 4]

export function UnitControls({ unit, multiplier, onUnitChange, onMultiplierChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-white/10 bg-bar-800 p-1">
        {(['oz', 'ml'] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onUnitChange(u)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              unit === u ? 'bg-amber-accent text-bar-950' : 'text-white/70'
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      <div className="inline-flex rounded-xl border border-white/10 bg-bar-800 p-1">
        {MULTIPLIERS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMultiplierChange(m)}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
              multiplier === m ? 'bg-amber-accent text-bar-950' : 'text-white/70'
            }`}
          >
            ×{m}
          </button>
        ))}
      </div>
    </div>
  )
}
