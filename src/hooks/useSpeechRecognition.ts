import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: ArrayLike<SpeechRecognitionResultLike> & { readonly length: number }
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(onFinalTranscript?: (transcript: string) => void) {
  const Recognition = getSpeechRecognitionCtor()
  const supported = Boolean(Recognition)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const latestTranscriptRef = useRef('')
  const onFinalRef = useRef(onFinalTranscript)

  useEffect(() => {
    onFinalRef.current = onFinalTranscript
  }, [onFinalTranscript])

  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) {
      setListening(false)
      return
    }
    try {
      recognition.stop()
    } catch {
      // ignore stop errors when already stopped
    }
  }, [])

  const start = useCallback(() => {
    if (!Recognition) {
      setError('Voice input is not supported in this browser.')
      return
    }

    setError(null)
    setTranscript('')
    latestTranscriptRef.current = ''

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0]?.transcript ?? ''
      }
      const trimmed = text.trim()
      latestTranscriptRef.current = trimmed
      setTranscript(trimmed)
    }

    recognition.onerror = (event) => {
      const code = event.error ?? 'error'
      if (code === 'aborted' || code === 'no-speech') {
        setListening(false)
        return
      }
      if (code === 'not-allowed') {
        setError('Microphone permission denied. Allow mic access and try again.')
      } else {
        setError(`Voice input failed (${code}). Try again.`)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      const finalText = latestTranscriptRef.current.trim()
      if (finalText) onFinalRef.current?.(finalText)
    }

    try {
      recognition.start()
      setListening(true)
    } catch {
      setError('Could not start voice input. Try again.')
      setListening(false)
    }
  }, [Recognition])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore
      }
    }
  }, [])

  return {
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    toggle,
    setTranscript,
    setError,
  }
}
