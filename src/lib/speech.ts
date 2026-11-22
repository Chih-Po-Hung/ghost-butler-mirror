/*
 * Speech for the Ghost-Butler Smart Mirror (milestone M5).
 *
 * All speech logic lives here: mute state, the voice list + the user's choice,
 * and speaking text. Uses only the browser's built-in speechSynthesis — no
 * library, no network, no external TTS API. Plain logic (no React) with a tiny
 * pub/sub; the UI subscribes via useSyncExternalStore.
 *
 * Voice preference: a Traditional Chinese voice (zh-TW/zh-HK/Hant), else any
 * Chinese voice, else the browser default; the user's persisted picker choice
 * wins over that. When speechSynthesis is missing this is a silent no-op, so
 * the mirror keeps working and logs nothing.
 */

const MUTE_KEY = 'ghost-butler:muted:v1'
const VOICE_KEY = 'ghost-butler:voice:v1'

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  } catch {
    return fallback
  }
}

function saveBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* storage may be unavailable; the choice stays in-memory */
  }
}

function loadStr(key: string, fallback: string | null): string | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw
  } catch {
    return fallback
  }
}

function saveStr(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* ignore storage failures */
  }
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null
}

/* ---------- mute store ---------- */

let muted = loadBool(MUTE_KEY, false)
const muteListeners = new Set<() => void>()

export function getMutedSnapshot(): boolean {
  return muted
}

export function subscribeMute(listener: () => void): () => void {
  muteListeners.add(listener)
  return () => {
    muteListeners.delete(listener)
  }
}

/** Set mute. Muting cancels all speech immediately — including a line already
 *  playing. Unmuting does not replay anything; the next reply/briefing speaks. */
export function setMuted(next: boolean): void {
  if (next === muted) return
  muted = next
  saveBool(MUTE_KEY, next)
  if (next) cancelSpeech()
  for (const l of muteListeners) l()
}

/* ---------- voice store ---------- */

export interface VoiceState {
  /** Voices the browser actually offers (may be empty until voiceschanged). */
  voices: SpeechSynthesisVoice[]
  /** Persisted voice choice, or null when the auto-preference is in use. */
  selectedURI: string | null
}

function readVoices(): SpeechSynthesisVoice[] {
  const s = synth()
  if (!s) return []
  try {
    return s.getVoices()
  } catch {
    return []
  }
}

let voices: SpeechSynthesisVoice[] = readVoices()
let selectedURI: string | null = loadStr(VOICE_KEY, null)
let voiceState: VoiceState = { voices, selectedURI }
const voiceListeners = new Set<() => void>()

function commitVoiceState(): void {
  voiceState = { voices, selectedURI }
  for (const l of voiceListeners) l()
}

function refreshVoices(): void {
  const next = readVoices()
  if (
    next.length === voices.length &&
    next.every((v, i) => v.voiceURI === voices[i]?.voiceURI)
  ) {
    return
  }
  voices = next
  commitVoiceState()
}

/** Snapshot for useSyncExternalStore (re-render on voices or choice change). */
export function getVoiceStateSnapshot(): VoiceState {
  return voiceState
}

export function subscribeVoiceState(listener: () => void): () => void {
  voiceListeners.add(listener)
  return () => {
    voiceListeners.delete(listener)
  }
}

/** Persist the user's voice choice. Pass null/'' to clear → auto-preference. */
export function setSelectedVoiceURI(uri: string | null): void {
  const next = uri && uri.length > 0 ? uri : null
  if (next === selectedURI) return
  selectedURI = next
  saveStr(VOICE_KEY, next)
  commitVoiceState()
}

/** Traditional Chinese voice, else any Chinese voice, else the browser
 *  default, else the first available. */
function preferredVoice(): SpeechSynthesisVoice | null {
  const tw = voices.find((v) => /^zh-(tw|hk|hant)/i.test(v.lang))
  if (tw) return tw
  const anyZh = voices.find((v) => /^zh/i.test(v.lang))
  if (anyZh) return anyZh
  return voices.find((v) => v.default) ?? voices[0] ?? null
}

/** The voice to speak with: the persisted choice when still offered, else the
 *  auto-preferred voice. */
function activeVoice(): SpeechSynthesisVoice | null {
  if (selectedURI) {
    const found = voices.find((v) => v.voiceURI === selectedURI)
    if (found) return found
  }
  return preferredVoice()
}

/** voiceURI that will be used for speech, or '' when none. */
export function activeVoiceURI(): string {
  return activeVoice()?.voiceURI ?? ''
}

/** Stop all speech immediately. Safe when nothing is playing. Never throws. */
function cancelSpeech(): void {
  const s = synth()
  if (!s) return
  try {
    s.cancel()
  } catch {
    /* some engines throw during teardown; ignore */
  }
}

function configure(u: SpeechSynthesisUtterance): void {
  const v = activeVoice()
  if (v) {
    u.voice = v
    u.lang = v.lang
  } else {
    u.lang = 'zh-TW'
  }
}

/** Speak `text` now, interrupting current speech so the newest line is heard.
 *  No-op when muted, unsupported, or blank. Never throws. */
export function speak(text: string): void {
  const s = synth()
  if (!s || muted) return
  const trimmed = text.trim()
  if (!trimmed) return
  try {
    s.cancel()
  } catch {
    /* ignore */
  }
  const u = new SpeechSynthesisUtterance(trimmed)
  configure(u)
  try {
    s.speak(u)
  } catch {
    /* utterance rejected (e.g. during teardown) — ignore */
  }
}

/* ---------- briefing: speak on load, fall back to first gesture ---------- */

let primedText: string | null = null
let primedStarted = false
let gestureArmed = false
let gestureHandler: (() => void) | null = null

function disarmGesture(): void {
  if (!gestureArmed) return
  gestureArmed = false
  if (gestureHandler) {
    window.removeEventListener('pointerdown', gestureHandler, true)
    window.removeEventListener('keydown', gestureHandler, true)
    gestureHandler = null
  }
}

function onPrimedStart(): void {
  primedStarted = true // the immediate attempt began → no fallback needed
  disarmGesture()
}

function onFirstGesture(): void {
  if (primedStarted) {
    disarmGesture()
    return
  }
  const text = primedText
  disarmGesture()
  if (!text || muted) return
  speak(text) // a real user gesture is in flight → speech is unlocked
}

function armGesture(): void {
  if (gestureArmed) return
  gestureArmed = true
  gestureHandler = () => onFirstGesture()
  window.addEventListener('pointerdown', gestureHandler, true)
  window.addEventListener('keydown', gestureHandler, true)
}

/** Speak `text` as the opening briefing. Attempted immediately; if the browser
 *  blocks speech before a user gesture, it is spoken on the first
 *  click/tap/keypress instead. No-op when muted or unsupported. The gesture
 *  fallback is owned here, so callers need not clean it up; calling again
 *  replaces any pending briefing. */
export function primeSpeech(text: string): void {
  disarmGesture()
  primedStarted = false
  primedText = null
  const s = synth()
  if (!s || muted) return
  const trimmed = text.trim()
  if (!trimmed) return
  primedText = trimmed
  const u = new SpeechSynthesisUtterance(trimmed)
  configure(u)
  u.addEventListener('start', onPrimedStart)
  try {
    s.speak(u)
  } catch {
    /* blocked or unsupported — fall through to the gesture fallback */
  }
  // Arm whether or not the attempt is expected to work: if it starts,
  // onPrimedStart disarms; if it is blocked, the first gesture speaks.
  armGesture()
}

const initialSynth = synth()
if (initialSynth) {
  try {
    initialSynth.addEventListener('voiceschanged', refreshVoices)
  } catch {
    /* some engines throw; the delayed refresh below covers it */
  }
  // Delayed refreshes cover engines that populate voices late without firing
  // voiceschanged.
  window.setTimeout(refreshVoices, 500)
  window.setTimeout(refreshVoices, 1500)
}

function teardown(): void {
  disarmGesture()
  cancelSpeech()
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', teardown)
