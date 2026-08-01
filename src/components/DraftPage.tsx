import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveToServer } from '../lib/serverSave'
import { PageHeader } from './PageHeader'

interface Props {
  draft: string
  onSave: (text: string) => void
  onSaved: () => void
}

export function DraftPage({ draft, onSave, onSaved }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft)
  const [syncedDraft, setSyncedDraft] = useState(draft)
  const [selection, setSelection] = useState('')
  const [saving, setSaving] = useState(false)
  const [pasteError, setPasteError] = useState<string | null>(null)

  if (!editing && draft !== syncedDraft) {
    setSyncedDraft(draft)
    setText(draft)
  }

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
    setPasteError(null)
  }

  const convertToRecipe = () => {
    if (!selection) return
    navigate('/add', { state: { fromDraft: selection } })
  }

  const handlePaste = async () => {
    setPasteError(null)
    try {
      const clip = (await navigator.clipboard.readText()).trim()
      if (!clip) {
        setPasteError('Clipboard is empty.')
        return
      }
      setText((prev) => {
        const body = prev.trim()
        return body ? `${clip}\n\n${body}` : clip
      })
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(0, 0)
        el.scrollTop = 0
      })
    } catch {
      setPasteError('Could not read clipboard. Allow paste permission and try again.')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    onSave(text)
    const status = await saveToServer()
    setSaving(false)
    if (status === 'synced') {
      setEditing(false)
      onSaved()
    }
  }

  const fieldClass =
    'w-full min-h-[60vh] resize-y rounded-2xl border border-app bg-bar-800 px-4 py-3 font-mono text-sm leading-relaxed text-foreground outline-none focus:border-amber-accent/60'

  return (
    <div className="pb-page-end">
      <PageHeader title="Draft" confirmBack={editing && text !== draft}>
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
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handlePaste()}
                className="text-sm font-semibold text-amber-light disabled:opacity-50"
              >
                Paste
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="text-sm font-semibold text-amber-accent disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button type="button" onClick={startEdit} className="text-sm font-semibold text-amber-accent">
              Edit
            </button>
          )}
        </div>
      </PageHeader>

      <div
        className="space-y-4 px-4 pt-4"
        ref={containerRef}
        onDoubleClick={() => {
          if (!editing) startEdit()
        }}
      >
        {editing && pasteError && (
          <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {pasteError}
          </p>
        )}

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

        {editing && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="w-full rounded-2xl bg-amber-accent py-3.5 text-base font-semibold text-bar-950 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save to server'}
          </button>
        )}
      </div>
    </div>
  )
}
