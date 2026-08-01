import { useCallback, useEffect, useRef, useState } from 'react'
import { loadAiSettings } from '../lib/aiStorage'
import { useSpeechRecognition } from './useSpeechRecognition'

interface Options<T> {
  items: T[]
  run: (transcript: string, items: T[]) => Promise<{ message: string; nextItems: T[]; changed: boolean }>
  onApplied: (nextItems: T[], message: string, changed: boolean) => void
}

export function useVoiceCommand<T>({ items, run, onApplied }: Options<T>) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [heard, setHeard] = useState('')
  const processingRef = useRef(false)
  const lastProcessedRef = useRef('')
  const itemsRef = useRef(items)
  const runRef = useRef(run)
  const onAppliedRef = useRef(onApplied)

  useEffect(() => {
    itemsRef.current = items
    runRef.current = run
    onAppliedRef.current = onApplied
  }, [items, run, onApplied])

  const hasApiKey = Boolean(loadAiSettings().apiKey.trim())

  const processTranscript = useCallback(async (transcript: string) => {
    const text = transcript.trim()
    if (!text || processingRef.current) return
    if (text === lastProcessedRef.current) return

    if (!loadAiSettings().apiKey.trim()) {
      setError('Add your API key in Settings to use voice commands.')
      return
    }

    processingRef.current = true
    lastProcessedRef.current = text
    setProcessing(true)
    setError(null)
    setHeard(text)

    try {
      const result = await runRef.current(text, itemsRef.current)
      onAppliedRef.current(result.nextItems, result.message, result.changed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice command failed.')
      lastProcessedRef.current = ''
    } finally {
      processingRef.current = false
      setProcessing(false)
    }
  }, [])

  const speech = useSpeechRecognition(processTranscript)

  const toggleMic = () => {
    setError(null)
    if (!speech.supported) {
      setError('Voice input is not supported in this browser.')
      return
    }
    if (!hasApiKey) {
      setError('Add your API key in Settings to use voice commands.')
      return
    }
    if (speech.listening) {
      speech.stop()
      return
    }
    lastProcessedRef.current = ''
    speech.start()
  }

  return {
    supported: speech.supported,
    listening: speech.listening,
    processing,
    transcript: speech.transcript,
    heard,
    error: error || speech.error,
    hasApiKey,
    toggleMic,
    clearError: () => setError(null),
  }
}
