import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatOneDReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import {
  createBarcodeLookupSession,
  isValidBarcode,
  type BarcodeLookupHit,
  type BarcodeLookupSession,
  type BarcodeProduct,
  type BarcodeSource,
} from '../lib/barcodeLookup'
import {
  isBarcodeScanSoundMuted,
  playBarcodeScanSound,
  setBarcodeScanSoundMuted,
} from '../lib/barcodeScanSound'
import {
  IconBarcode,
  IconClose,
  IconDatabase,
  IconEdit,
  IconPlus,
  IconScan,
  IconVolume,
  IconVolumeMuted,
} from './icons'

export function BarcodeScanButton({
  disabled,
  onClick,
}: {
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label="Scan barcode"
      title="Scan barcode"
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition hover:text-foreground disabled:opacity-30"
    >
      <IconBarcode size={18} />
    </button>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onProduct: (product: BarcodeProduct) => void
  /** Invoked when the scan is unusable and the user chooses to type the item in by hand. */
  onManualAdd?: (barcode: string) => void
}

const primaryActionClass =
  'flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-accent py-3.5 text-base font-semibold text-bar-950 disabled:opacity-40'

const secondaryActionClass =
  'flex w-full items-center justify-center gap-2 rounded-2xl border border-app-strong py-3.5 text-base font-semibold text-foreground disabled:opacity-40'

async function openCameraStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: 'environment' } } },
    { audio: false, video: { facingMode: { ideal: 'user' } } },
    { audio: false, video: true },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not open the camera.')
}

function ScannerSession({ onCode, onRetry }: { onCode: (code: string) => void; onRetry: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const handledRef = useRef(false)
  const onCodeRef = useRef(onCode)
  const [status, setStatus] = useState('Starting camera…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    const reader = new BrowserMultiFormatOneDReader()
    let cancelled = false

    const stopCamera = () => {
      controlsRef.current?.stop()
      controlsRef.current = null
      const stream = streamRef.current
      streamRef.current = null
      if (stream) {
        for (const track of stream.getTracks()) track.stop()
      }
      const video = videoRef.current
      if (video) {
        video.srcObject = null
      }
    }

    const start = async () => {
      const video = videoRef.current
      if (!video) return

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not supported in this browser.')
        }

        const stream = await openCameraStream()
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop()
          return
        }

        streamRef.current = stream
        video.srcObject = stream
        video.muted = true
        video.setAttribute('playsinline', 'true')
        await video.play().catch(() => {
          // Autoplay can reject if already playing; ignore.
        })

        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (!result || handledRef.current || cancelled) return
          handledRef.current = true
          playBarcodeScanSound()
          stopCamera()
          onCodeRef.current(result.getText().trim())
        })

        if (cancelled) {
          controls.stop()
          return
        }

        controlsRef.current = controls
        setStatus('Point the camera at a barcode…')
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Could not open the camera.'
        if (/Permission|NotAllowed/i.test(message)) {
          setError('Camera permission denied. Allow camera access and try again.')
        } else {
          setError(message)
        }
        setStatus('Camera unavailable.')
        stopCamera()
      }
    }

    void start()

    return () => {
      cancelled = true
      // Only stop this session's stream — do not call releaseAllStreams()
      // (React Strict Mode remounts would kill the next session's camera).
      stopCamera()
    }
  }, [])

  return (
    <>
      <div className="relative aspect-[3/4] w-full max-h-[60dvh] overflow-hidden rounded-2xl border border-app bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-[70%] rounded-xl border-2 border-amber-accent/80 bg-transparent" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[calc(50%-3.5rem)] bg-black/35" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(50%-3.5rem)] bg-black/35" />
      </div>

      <p className="mt-4 text-center text-sm text-muted">{status}</p>

      {error && (
        <>
          <p className="mt-3 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
          <button type="button" onClick={onRetry} className={`${primaryActionClass} mt-4`}>
            <IconScan size={18} />
            Try again
          </button>
        </>
      )}
    </>
  )
}

function sourceNames(sources: BarcodeSource[]): string {
  return sources.map((source) => source.label).join(', ')
}

function ProductCard({ product, onAdd }: { product: BarcodeProduct; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-center gap-3 rounded-2xl border border-amber-accent/40 bg-amber-accent/10 p-3 text-left transition hover:bg-amber-accent/15"
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl border border-app bg-bar-800 object-contain"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{product.name}</span>
        {product.brand && <span className="mt-0.5 block text-xs text-subtle">{product.brand}</span>}
        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-light">
          <IconPlus size={14} />
          Add this item
        </span>
      </span>
    </button>
  )
}

function ResultsView({
  hit,
  onAdd,
  onManualAdd,
  onNextDatabase,
  onCancel,
}: {
  hit: BarcodeLookupHit
  onAdd: (product: BarcodeProduct) => void
  onManualAdd: () => void
  onNextDatabase: () => void
  onCancel: () => void
}) {
  const many = hit.products.length > 1

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-foreground">
          {many ? `${hit.products.length} matches` : 'Found'} in{' '}
          <span className="font-semibold text-amber-light">{hit.source.label}</span>
        </p>
        <p className="mt-0.5 text-xs text-subtle">
          {many ? 'Tap the correct one to add it.' : 'Check the name before adding it.'}
        </p>
      </div>

      <div className="max-h-[45dvh] space-y-2 overflow-y-auto">
        {hit.products.map((product, index) => (
          <ProductCard key={`${product.barcode}-${index}`} product={product} onAdd={() => onAdd(product)} />
        ))}
      </div>

      <button type="button" onClick={onManualAdd} className={secondaryActionClass}>
        <IconEdit size={18} />
        Not it — add manually
      </button>

      <button
        type="button"
        onClick={onNextDatabase}
        disabled={!hit.hasMoreSources}
        className={secondaryActionClass}
      >
        <IconDatabase size={18} />
        {hit.hasMoreSources ? 'Look at the next database' : 'No more databases'}
      </button>

      <button type="button" onClick={onCancel} className={secondaryActionClass}>
        <IconClose size={18} />
        Cancel
      </button>
    </div>
  )
}

function EmptyView({
  barcode,
  searched,
  exhausted,
  onManualAdd,
  onScanAgain,
  onCancel,
}: {
  barcode: string
  searched: BarcodeSource[]
  exhausted: boolean
  onManualAdd: () => void
  onScanAgain: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-app bg-bar-900/60 p-4">
        <p className="text-sm font-semibold text-foreground">
          {exhausted ? 'No more matches' : 'No product found'}
        </p>
        <p className="mt-1 text-sm text-muted">
          Barcode <span className="font-mono text-foreground">{barcode}</span> is not in{' '}
          {searched.length > 0 ? sourceNames(searched) : 'any connected database'}.
        </p>
        <p className="mt-2 text-sm text-muted">Add this bottle manually, or cancel.</p>
      </div>

      <button type="button" onClick={onManualAdd} className={primaryActionClass}>
        <IconPlus size={18} />
        Add a new one manually
      </button>

      <button type="button" onClick={onScanAgain} className={secondaryActionClass}>
        <IconScan size={18} />
        Scan again
      </button>

      <button type="button" onClick={onCancel} className={secondaryActionClass}>
        <IconClose size={18} />
        Cancel
      </button>
    </div>
  )
}

type Phase =
  | { kind: 'camera' }
  | { kind: 'looking-up'; barcode: string }
  | { kind: 'results'; barcode: string; hit: BarcodeLookupHit }
  | { kind: 'empty'; barcode: string; searched: BarcodeSource[]; exhausted: boolean }

function ScannerModalContent({ onClose, onProduct, onManualAdd }: Omit<Props, 'open'>) {
  const [sessionKey, setSessionKey] = useState(0)
  const [soundMuted, setSoundMuted] = useState(() => isBarcodeScanSoundMuted())
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' })
  const lookupRef = useRef<BarcodeLookupSession | null>(null)
  const searchedRef = useRef<BarcodeSource[]>([])

  const toggleSound = () => {
    const next = !soundMuted
    setBarcodeScanSoundMuted(next)
    setSoundMuted(next)
    if (!next) playBarcodeScanSound()
  }

  const advance = async (session: BarcodeLookupSession, exhausted: boolean) => {
    setPhase({ kind: 'looking-up', barcode: session.barcode })
    const hit = await session.next()
    if (hit) {
      searchedRef.current = [...searchedRef.current, ...hit.searched]
      setPhase({ kind: 'results', barcode: session.barcode, hit })
      return
    }
    setPhase({
      kind: 'empty',
      barcode: session.barcode,
      searched: searchedRef.current,
      exhausted,
    })
  }

  const handleCode = (code: string) => {
    if (!isValidBarcode(code)) {
      setPhase({ kind: 'empty', barcode: code, searched: [], exhausted: false })
      return
    }
    const session = createBarcodeLookupSession(code)
    lookupRef.current = session
    searchedRef.current = []
    void advance(session, false)
  }

  const scanAgain = () => {
    lookupRef.current = null
    searchedRef.current = []
    setPhase({ kind: 'camera' })
    setSessionKey((key) => key + 1)
  }

  const addProduct = (product: BarcodeProduct) => {
    onProduct(product)
    onClose()
  }

  const addManually = (barcode: string) => {
    onManualAdd?.(barcode)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bar-950">
      <div className="flex items-center gap-2 border-b border-app px-4 py-4">
        <button
          type="button"
          aria-label="Close scanner"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition hover:text-foreground"
        >
          <IconClose size={20} />
        </button>
        <h2 className="min-w-0 flex-1 font-display text-xl font-bold text-foreground">Scan barcode</h2>
        <button
          type="button"
          aria-label={soundMuted ? 'Unmute scan sound' : 'Mute scan sound'}
          aria-pressed={soundMuted}
          title={soundMuted ? 'Unmute scan sound' : 'Mute scan sound'}
          onClick={toggleSound}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition hover:text-foreground"
        >
          {soundMuted ? <IconVolumeMuted size={18} /> : <IconVolume size={18} />}
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-page-end">
        {phase.kind === 'camera' && (
          <ScannerSession key={sessionKey} onCode={handleCode} onRetry={scanAgain} />
        )}

        {phase.kind === 'looking-up' && (
          <p className="py-8 text-center text-sm text-muted">Looking up {phase.barcode}…</p>
        )}

        {phase.kind === 'results' && (
          <ResultsView
            hit={phase.hit}
            onAdd={addProduct}
            onManualAdd={() => addManually(phase.barcode)}
            onNextDatabase={() => {
              const session = lookupRef.current
              if (session) void advance(session, true)
            }}
            onCancel={onClose}
          />
        )}

        {phase.kind === 'empty' && (
          <EmptyView
            barcode={phase.barcode}
            searched={phase.searched}
            exhausted={phase.exhausted}
            onManualAdd={() => addManually(phase.barcode)}
            onScanAgain={scanAgain}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  )
}

export function BarcodeScannerModal({ open, ...props }: Props) {
  if (!open) return null
  return <ScannerModalContent {...props} />
}
