import { loadLocalUiPrefs, saveLocalUiPrefs } from './localPrefs'

let audioCtx: AudioContext | null = null

export function isBarcodeScanSoundMuted(): boolean {
  return Boolean(loadLocalUiPrefs().barcodeScanSoundMuted)
}

export function setBarcodeScanSoundMuted(muted: boolean) {
  saveLocalUiPrefs({ barcodeScanSoundMuted: muted })
}

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new Ctx()
    }
    return audioCtx
  } catch {
    return null
  }
}

/** Short scanner-style beep. Call when a barcode is recognized (before lookup). */
export function playBarcodeScanSound() {
  if (isBarcodeScanSoundMuted()) return

  const ctx = getAudioContext()
  if (!ctx) return

  const start = () => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(2400, now)
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.13)
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(start).catch(() => {})
  } else {
    start()
  }
}
