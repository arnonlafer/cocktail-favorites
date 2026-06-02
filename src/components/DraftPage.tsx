import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface Props {
  draft: string
  onSave: (text: string) => void
}

export function DraftPage({ draft, onSave }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft)
  const [selection, setSelection] = useState('')

  useEffect(() => {
    if (!editing) setText(draft)
  }, [draft, editing])

  useEffect(() => {
    if (!editing) return
    const timer = window.setTimeout(() => onSave(text), 600)
    return () => window.clearTimeout(timer)
  }, [text, editing, onSave])

  const readSelection = useCallback(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      const start = el.selectionStart
      const end = el.selectionEnd
      if (start !== end) {
        setSelection(el.value.slice(start, end).trim())
        return
      }
      setSelection('')
      return
    }

    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setSelection('')
      return
    }
    const anchor = sel.anchorNode
    const focus = sel.focusNode
    if (!anchor || !focus || !containerRef.current.contains(anchor) || !containerRef.current.contains(focus)) {
      setSelection('')
      return
    }
    setSelection(sel.toString().trim())
  }, [editing])

  useEffect(() => {
    document.addEventListener('selectionchange', readSelection)
    return () => document.removeEventListener('selectionchange', readSelection)
  }, [readSelection])

  const startEdit = () => {
    setText(draft)
    setEditing(true)
    setSelection('')
  }

  const finishEdit = () => {
    onSave(text)
    setEditing(false)
    setSelection('')
  }

  const convertToRecipe = () => {
    if (!selection) return
    navigate('/add', { state: { fromDraft: selection } })
  }

  const fieldClass =
    'w-full min-h-[60vh] resize-y rounded-2xl border border-app bg-bar-800 px-4 py-3 font-mono text-sm leading-relaxed text-foreground outline-none focus:border-amber-accent/60'

  return (
    <div className="safe-bottom pb-28">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-app bg-app px-4 py-3 backdrop-blur">
        <Link to="/" className="shrink-0 text-amber-accent">
          ← Back
        </Link>
        <h1 className="font-display text-lg font-bold text-foreground">Draft</h1>
        {editing ? (
          <button type="button" onClick={finishEdit} className="shrink-0 text-sm font-semibold text-amber-accent">
            Done
          </button>
        ) : (
          <button type="button" onClick={startEdit} className="shrink-0 text-sm font-semibold text-amber-accent">
            Edit
          </button>
        )}
      </div>

      <div className="px-4 pt-4" ref={containerRef}>
        {editing ? (
          <textarea
            ref={textareaRef}
            className={fieldClass}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={readSelection}
            placeholder="Paste or write a recipe draft…"
            autoFocus
          />
        ) : text.trim() ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text}</div>
        ) : (
          <p className="text-sm text-subtle">
            No draft yet. Tap <span className="text-amber-accent">Edit</span> to start writing.
          </p>
        )}
      </div>

      {selection && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-app bg-bar-900/95 px-4 py-3 backdrop-blur safe-bottom">
          <p className="mb-2 truncate text-xs text-subtle">
            Selected: {selection.length > 48 ? `${selection.slice(0, 48)}…` : selection}
          </p>
          <button
            type="button"
            onClick={convertToRecipe}
            className="w-full rounded-2xl bg-amber-accent py-3 text-sm font-semibold text-bar-950"
          >
            Create recipe from selection
          </button>
        </div>
      )}
    </div>
  )
}
