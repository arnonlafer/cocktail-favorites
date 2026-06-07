import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from './PageHeader'

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
    <div>
      <PageHeader title="Draft">
        <div className="flex shrink-0 items-center gap-2">
          {selection && (
            <button
              type="button"
              onClick={convertToRecipe}
              title="Create recipe from selection"
              className="rounded-lg border border-amber-accent/50 bg-amber-accent/15 px-2.5 py-1.5 text-xs font-semibold text-amber-light"
            >
              → Recipe
            </button>
          )}
          {editing ? (
            <button type="button" onClick={finishEdit} className="text-sm font-semibold text-amber-accent">
              Done
            </button>
          ) : (
            <button type="button" onClick={startEdit} className="text-sm font-semibold text-amber-accent">
              Edit
            </button>
          )}
        </div>
      </PageHeader>

      <div
        className="px-4 pt-4"
        ref={containerRef}
        onDoubleClick={() => {
          if (!editing) startEdit()
        }}
      >
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
          <div className="cursor-text whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text}</div>
        ) : (
          <p className="cursor-text text-sm text-subtle">
            No draft yet. Double-click or tap <span className="text-amber-accent">Edit</span> to start writing.
          </p>
        )}
      </div>
    </div>
  )
}
