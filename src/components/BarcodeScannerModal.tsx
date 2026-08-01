import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatOneDReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import { lookupBarcodeProduct, type BarcodeProduct } from '../lib/barcodeLookup'
import { IconBarcode, IconClose } from './icons'

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
}

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

function ScannerSession({
  onClose,
  onProduct,
  onRetry,
}: {
  onClose: () => void
  onProduct: (product: BarcodeProduct) => void
  onRetry: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const handledRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const onProductRef = useRef(onProduct)
  const [status, setStatus] = useState('Starting camera…')
  const [error, setError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
    onProductRef.current = onProduct
  }, [onClose, onProduct])

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

    const lookupCode = async (code: string) => {
      setLookingUp(true)
      setStatus(`Looking up ${code}…`)
      try {
        const product = await lookupBarcodeProduct(code)
        if (cancelled) return
        if (!product) {
          setLookingUp(false)
          setError(`No product found for barcode ${code}.`)
          setStatus('Tap Try again to scan another bottle.')
          return
        }
        onProductRef.current(product)
        onCloseRef.current()
      } catch {
        if (cancelled) return
        setLookingUp(false)
        setError('Could not look up this barcode. Check your connection and try again.')
        setStatus('Tap Try again to scan another bottle.')
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
          controlsRef.current?.stop()
          controlsRef.current = null
          void lookupCode(result.getText().trim())
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
        <p className="mt-3 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        {error && !lookingUp && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 rounded-2xl bg-amber-accent py-3.5 text-base font-semibold text-bar-950"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl border border-app-strong py-3.5 text-base font-semibold text-foreground"
        >
          Cancel
        </button>
      </div>
    </>
  )
}

export function BarcodeScannerModal({ open, onClose, onProduct }: Props) {
  const [sessionKey, setSessionKey] = useState(0)

  if (!open) return null

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
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-4 pt-4 pb-page-end">
        <ScannerSession
          key={sessionKey}
          onClose={onClose}
          onProduct={onProduct}
          onRetry={() => setSessionKey((key) => key + 1)}
        />
      </div>
    </div>
  )
}
