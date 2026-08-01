import { Link } from 'react-router-dom'
import { IconMic } from './icons'

export function VoiceMicButton({
  listening,
  disabled,
  onClick,
  title,
}: {
  listening: boolean
  disabled?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      aria-label={listening ? 'Stop listening' : 'Voice command'}
      title={title ?? (listening ? 'Stop listening' : 'Voice command')}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-30 ${
        listening
          ? 'border-amber-accent bg-amber-accent/20 text-amber-accent animate-pulse'
          : 'border-app-strong text-muted hover:text-foreground'
      }`}
    >
      <IconMic size={18} />
    </button>
  )
}

interface PanelProps {
  listening: boolean
  processing: boolean
  transcript: string
  heard: string
  error: string | null
  verifyMessage: string | null
  canSave: boolean
  saving: boolean
  saveMessage: { ok: boolean; message: string } | null
  onSave: () => void
  onDiscard?: () => void
}

export function VoiceCommandPanel({
  listening,
  processing,
  transcript,
  heard,
  error,
  verifyMessage,
  canSave,
  saving,
  saveMessage,
  onSave,
  onDiscard,
}: PanelProps) {
  const statusText = listening
    ? transcript.trim() || 'Listening…'
    : processing
      ? 'Understanding command…'
      : heard
        ? `Heard: “${heard}”`
        : null

  const show = Boolean(statusText || error || verifyMessage || saveMessage || canSave)
  if (!show) return null

  return (
    <div className="space-y-2 rounded-2xl border border-app bg-bar-900/60 p-3">
      {statusText && <p className="text-sm text-muted">{statusText}</p>}

      {error && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error.includes('Settings') ? (
            <>
              Add your API key in{' '}
              <Link to="/settings" className="font-semibold text-amber-accent underline">
                Settings
              </Link>{' '}
              to use voice commands.
            </>
          ) : (
            error
          )}
        </p>
      )}

      {verifyMessage && (
        <p className="rounded-xl border border-amber-accent/30 bg-amber-accent/10 px-3 py-2 text-sm text-amber-light">
          {verifyMessage}
        </p>
      )}

      {saveMessage && (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            saveMessage.ok
              ? 'border border-emerald-900/40 bg-emerald-950/30 text-emerald-200'
              : 'border border-red-900/50 bg-red-950/40 text-red-200'
          }`}
        >
          {saveMessage.message}
        </p>
      )}

      {(canSave || onDiscard) && (
        <div className="flex gap-2">
          {onDiscard && canSave && (
            <button
              type="button"
              disabled={saving || processing}
              onClick={onDiscard}
              className="flex-1 rounded-2xl border border-app-strong py-3 text-sm font-semibold text-foreground disabled:opacity-40"
            >
              Discard
            </button>
          )}
          {canSave && (
            <button
              type="button"
              disabled={saving || processing}
              onClick={onSave}
              className="flex-1 rounded-2xl bg-amber-accent py-3 text-sm font-semibold text-bar-950 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
