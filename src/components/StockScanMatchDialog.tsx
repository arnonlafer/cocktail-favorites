import type { StockItem } from '../types'
import { IconClose } from './icons'

interface Props {
  scannedName: string
  candidates: StockItem[]
  onSelectExisting: (item: StockItem) => void
  onAddNew: () => void
  onCancel: () => void
}

export function StockScanMatchDialog({
  scannedName,
  candidates,
  onSelectExisting,
  onAddNew,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-scan-match-title"
        className="w-full max-w-md rounded-2xl border border-app bg-bar-950 p-4 shadow-xl"
      >
        <div className="mb-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="stock-scan-match-title" className="font-display text-lg font-bold text-foreground">
              Similar bottles found
            </h2>
            <p className="mt-1 text-sm text-muted">
              Scanned “{scannedName}”. Pick an existing bottle, or None to add a new one.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition hover:text-foreground"
          >
            <IconClose size={18} />
          </button>
        </div>

        <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
          {candidates.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectExisting(item)}
                className="w-full rounded-xl border border-app bg-bar-900/60 px-4 py-3 text-left transition hover:border-amber-accent/40 hover:bg-bar-800/80"
              >
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {item.open ? 'Open · ' : ''}
                  {item.quantityLeft <= 0 ? 'Ran out' : `${item.quantityLeft} left`}
                </p>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onAddNew}
              className="w-full rounded-xl border border-amber-accent/40 bg-amber-accent/10 px-4 py-3 text-left text-sm font-semibold text-amber-light transition hover:bg-amber-accent/15"
            >
              None — add “{scannedName}” as new
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
