import { useEffect, useRef, useState } from 'react'
import { respond, type ButlerContext } from '../lib/butler'
import { speak } from '../lib/speech'
import './ButlerChat.css'

interface ChatMessage {
  id: number
  role: 'butler' | 'user'
  text: string
}

interface ButlerChatProps {
  /** Live weather snapshot, or null when unavailable — wired from MirrorFace. */
  weather: ButlerContext['weather']
  /** Today's events (already filtered to today) — wired from MirrorFace. */
  events: ButlerContext['events']
  /** The live clock — wired from MirrorFace. */
  now: ButlerContext['now']
}

/** Opening line, in character, shown when the chat is first opened. */
const OPENING = '主人，鏡中管家在此。有事但說無妨。'

// Monotonic message id, module-scoped so reopening keeps ids unique.
let nextId = 1

/**
 * Butler chat panel for the Ghost-Butler Smart Mirror (milestone M4).
 *
 * A corner toggle opens a phosphor-styled conversation panel. The butler's
 * replies come from the scripted `respond()` in lib/butler, fed entirely by
 * the live state MirrorFace already holds (weather snapshot, today's events,
 * the clock) — there is no second data source here. Enter (or the 送出
 * button) sends; the butler and user lines are drawn to read as distinct
 * speakers. Each reply is spoken aloud via lib/speech (a no-op when muted).
 */
export default function ButlerChat({ weather, events, now }: ButlerChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: nextId++, role: 'butler', text: OPENING },
  ])
  const [input, setInput] = useState('')
  const logRef = useRef<HTMLDivElement | null>(null)

  // Keep the newest line in view whenever the log grows or the panel opens.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, open])

  function send() {
    const text = input.trim()
    if (!text) return
    const ctx: ButlerContext = { weather, events, now }
    const reply = respond(text, ctx)
    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: 'user', text },
      { id: nextId++, role: 'butler', text: reply },
    ])
    // Read each butler reply aloud as it appears (the speech module is a
    // no-op when muted or unsupported, so this never breaks the chat).
    speak(reply)
    setInput('')
  }

  return (
    <div className="butler">
      <button
        type="button"
        className="butler__toggle"
        aria-expanded={open}
        aria-controls="butler-chat"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '關閉' : '管家'}
      </button>

      {open && (
        <div id="butler-chat" className="butler__panel" role="dialog" aria-label="與管家對話">
          <div className="butler__log" ref={logRef}>
            {messages.map((m) => (
              <p key={m.id} className={`butler__line butler__line--${m.role}`}>
                <span className="butler__speaker">{m.role === 'butler' ? '管家' : '主人'}</span>
                <span className="butler__text">{m.text}</span>
              </p>
            ))}
          </div>

          <form
            className="butler__input-row"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input
              type="text"
              className="butler__input"
              value={input}
              placeholder="向管家吩咐…"
              aria-label="訊息"
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="butler__send" disabled={input.trim() === ''}>
              送出
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
