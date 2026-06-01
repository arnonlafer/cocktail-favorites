import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search cocktails or ingredients…' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const focusedRef = useRef(false)
  const composingRef = useRef(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!focusedRef.current) setDraft(value)
  }, [value])

  const publish = (next: string) => {
    setDraft(next)
    onChange(next)
  }

  const readAndPublish = () => {
    const next = inputRef.current?.value ?? ''
    publish(next)
  }

  const handleInput = () => {
    const next = inputRef.current?.value ?? ''
    setDraft(next)
    if (!composingRef.current) {
      onChange(next)
      // iOS keyboard suggestions often apply the word after the first input event.
      requestAnimationFrame(() => {
        if (composingRef.current) return
        const v = inputRef.current?.value ?? ''
        if (v !== next) publish(v)
      })
    }
  }

  const clear = () => {
    publish('')
    inputRef.current?.focus()
  }

  const hasQuery = draft.length > 0

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">🔍</span>
      {hasQuery && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-bar-700 hover:text-foreground"
        >
          ×
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="on"
        spellCheck={false}
        value={draft}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={() => {
          focusedRef.current = false
          readAndPublish()
        }}
        onInput={handleInput}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionEnd={() => {
          composingRef.current = false
          readAndPublish()
        }}
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-app bg-bar-800 py-3 pl-10 text-foreground placeholder:text-subtle outline-none focus:border-amber-accent/60 ${hasQuery ? 'pr-11' : 'pr-4'}`}
      />
    </div>
  )
}
