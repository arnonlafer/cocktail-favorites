import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AiChat, AiMessage, Cocktail } from '../types'
import { sendAiChatMessage } from '../lib/aiApi'
import { formatRecipesForAi } from '../lib/aiRecipesContext'
import {
  chatTitleFromMessage,
  createAiChat,
  createAiMessage,
  deleteAiChat,
  getAiChat,
  loadAiChats,
  loadAiSettings,
  upsertAiChat,
} from '../lib/aiStorage'
import { saveToServer } from '../lib/serverSave'
import { subscribeSyncApplied } from '../lib/sync'
import { PageHeader } from './PageHeader'
import { AiMessageMarkdown } from './AiMessageMarkdown'
import { IconClose } from './icons'

function formatChatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function previewText(chat: AiChat): string {
  const last = chat.messages[chat.messages.length - 1]
  if (!last) return 'No messages yet'
  const text = last.content.trim().replace(/\s+/g, ' ')
  return text.length > 72 ? `${text.slice(0, 69)}…` : text
}

function AiChatList() {
  const navigate = useNavigate()
  const [chats, setChats] = useState<AiChat[]>(() => loadAiChats())
  const settings = loadAiSettings()

  const refresh = useCallback(() => {
    setChats(loadAiChats())
  }, [])

  useEffect(() => subscribeSyncApplied(refresh), [refresh])

  const startNewChat = () => {
    const chat = createAiChat()
    upsertAiChat(chat)
    void saveToServer()
    navigate(`/ai/${chat.id}`)
  }

  const removeChat = (id: string) => {
    if (!window.confirm('Delete this chat?')) return
    deleteAiChat(id)
    void saveToServer()
    refresh()
  }

  return (
    <div>
      <PageHeader title="AI">
        <button type="button" onClick={startNewChat} className="text-sm font-semibold text-amber-accent">
          New
        </button>
      </PageHeader>

      <div className="space-y-4 px-4 pt-4">
        {!settings.apiKey.trim() && (
          <p className="rounded-2xl border border-amber-accent/30 bg-amber-accent/10 px-4 py-3 text-sm text-amber-light">
            Add your API key in{' '}
            <Link to="/settings" className="font-semibold text-amber-accent underline">
              Settings
            </Link>{' '}
            to start chatting.
          </p>
        )}

        {chats.length === 0 ? (
          <p className="text-sm text-subtle">No saved chats yet. Tap New to start one.</p>
        ) : (
          <ul className="divide-y divide-app overflow-hidden rounded-2xl border border-app bg-bar-900/60">
            {chats.map((chat) => (
              <li key={chat.id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => navigate(`/ai/${chat.id}`)}
                  className="min-w-0 flex-1 px-4 py-3.5 text-left transition hover:bg-bar-800/80"
                >
                  <p className="truncate text-sm font-medium text-foreground">{chat.title}</p>
                  <p className="mt-1 truncate text-xs text-subtle">{previewText(chat)}</p>
                  <p className="mt-1 text-[11px] text-subtle">{formatChatTime(chat.updatedAt)}</p>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${chat.title}`}
                  onClick={() => removeChat(chat.id)}
                  className="flex w-12 shrink-0 items-center justify-center border-l border-app text-muted transition hover:bg-bar-800/80 hover:text-foreground"
                >
                  <IconClose size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        data-assistant-message={isUser ? undefined : true}
        className={`min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'max-w-[85%] whitespace-pre-wrap bg-amber-accent text-bar-950'
            : 'w-full max-w-full border border-app bg-bar-900/80 text-foreground'
        }`}
      >
        {isUser ? message.content : <AiMessageMarkdown content={message.content} />}
      </div>
    </div>
  )
}

function AiChatView({ chatId, cocktails }: { chatId: string; cocktails: Cocktail[] }) {
  const navigate = useNavigate()
  const [chat, setChat] = useState<AiChat | null>(() => getAiChat(chatId) ?? null)
  const [draft, setDraft] = useState('')
  const [includeRecipes, setIncludeRecipes] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const settings = loadAiSettings()
  const recipesContext = useMemo(
    () => (includeRecipes ? formatRecipesForAi(cocktails) : undefined),
    [includeRecipes, cocktails],
  )

  useEffect(() => {
    setChat(getAiChat(chatId) ?? null)
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages.length, sending])

  const readSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !messagesRef.current) {
      setSelection('')
      return
    }
    const anchor = sel.anchorNode
    const focus = sel.focusNode
    if (!anchor || !focus || !messagesRef.current.contains(anchor) || !messagesRef.current.contains(focus)) {
      setSelection('')
      return
    }
    const element =
      anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element)
    if (!element?.closest('[data-assistant-message]')) {
      setSelection('')
      return
    }
    setSelection(sel.toString().trim())
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', readSelection)
    return () => document.removeEventListener('selectionchange', readSelection)
  }, [readSelection])

  if (!chat) {
    return (
      <div>
        <PageHeader title="AI" backTo="/ai" />
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted">Chat not found.</p>
          <button
            type="button"
            onClick={() => navigate('/ai')}
            className="mt-4 text-sm font-semibold text-amber-accent"
          >
            Back to chats
          </button>
        </div>
      </div>
    )
  }

  const persistChat = (next: AiChat) => {
    upsertAiChat(next)
    setChat(next)
    void saveToServer()
  }

  const removeChat = () => {
    if (!window.confirm('Delete this chat?')) return
    deleteAiChat(chat.id)
    void saveToServer()
    navigate('/ai')
  }

  const sendMessage = async () => {
    const content = draft.trim()
    if (!content || sending) return

    setError(null)
    setDraft('')

    const userMessage = createAiMessage('user', content)
    const withUser: AiChat = {
      ...chat,
      title: chat.messages.length === 0 ? chatTitleFromMessage(content) : chat.title,
      messages: [...chat.messages, userMessage],
      updatedAt: Date.now(),
    }
    persistChat(withUser)
    setSending(true)

    try {
      const reply = await sendAiChatMessage(settings, withUser.messages, recipesContext)
      const assistantMessage = createAiMessage('assistant', reply)
      persistChat({
        ...withUser,
        messages: [...withUser.messages, assistantMessage],
        updatedAt: Date.now(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setSending(false)
    }
  }

  const convertToRecipe = () => {
    if (!selection) return
    navigate('/add', { state: { fromDraft: selection } })
  }

  const fieldClass =
    'min-w-0 flex-1 resize-none rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-sm text-foreground outline-none focus:border-amber-accent/60'

  return (
    <div className="flex min-h-[calc(100dvh-3.25rem-env(safe-area-inset-bottom,0px))] flex-col">
      <PageHeader title={chat.title} backTo="/ai">
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
          <button type="button" onClick={removeChat} className="text-sm font-semibold text-red-300">
            Delete
          </button>
        </div>
      </PageHeader>

      <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chat.messages.length === 0 && (
          <p className="text-sm text-subtle">Ask about cocktails, recipes, substitutions, or bar tips.</p>
        )}
        {chat.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-app bg-bar-900/80 px-4 py-3 text-sm text-subtle">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-t border-red-900/40 bg-red-950/30 px-4 py-2 text-sm text-red-200">{error}</p>
      )}

      {!settings.apiKey.trim() && (
        <p className="border-t border-app px-4 py-2 text-xs text-subtle">
          Configure your API key in{' '}
          <Link to="/settings" className="text-amber-accent underline">
            Settings
          </Link>
          .
        </p>
      )}

      <form
        className="border-t border-app px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          void sendMessage()
        }}
      >
        <label className="mb-3 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={includeRecipes}
            onChange={(e) => setIncludeRecipes(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-app accent-amber-accent"
          />
          <span className="text-xs leading-snug text-muted">
            Include my recipes ({cocktails.length}) so I can ask about them
          </span>
        </label>
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder="Message…"
            disabled={sending || !settings.apiKey.trim()}
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending || !settings.apiKey.trim()}
            className="shrink-0 rounded-xl bg-amber-accent px-4 py-2.5 text-sm font-semibold text-bar-950 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

export function AiPage({ cocktails }: { cocktails: Cocktail[] }) {
  const { chatId } = useParams()

  if (chatId) return <AiChatView chatId={chatId} cocktails={cocktails} />
  return <AiChatList />
}
