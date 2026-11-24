import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HAUNT_INITIAL_DELAY_MS,
  HAUNT_INTERVAL_MS,
  HAUNT_LINE_MS,
  loadHauntEnabled,
  nextHauntLine,
  saveHauntEnabled,
} from '../lib/haunt'
import './HauntMode.css'

interface HauntModeProps {
  /**
   * Called with each interjection line (manual or automatic). The parent
   * flashes the 1-second mirror glitch and speaks the line — speaking
   * through the shared speech module, so mute still silences it.
   */
  onHaunt: (line: string) => void
}

/**
 * Haunt mode for the Ghost-Butler Smart Mirror (milestone M6).
 *
 * The butler drops a spooky interjection every few minutes, or right now
 * on the 作祟 button. Each interjection shows as a dismissible line on the
 * mirror and asks the parent for the 1-second glitch. The automatic
 * haunts can be switched off (persisted); the manual button always works,
 * because the user asked for it. Nothing here touches the briefing,
 * weather, schedule, chat, or speech state — this is a self-contained
 * overlay that only calls back out with the line.
 */
export default function HauntMode({ onHaunt }: HauntModeProps) {
  const [enabled, setEnabled] = useState(() => loadHauntEnabled())
  const [line, setLine] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const indexRef = useRef(-1)
  const dismissRef = useRef<number | undefined>(undefined)
  const onHauntRef = useRef(onHaunt)
  onHauntRef.current = onHaunt

  const trigger = useCallback(() => {
    const { line: next, index } = nextHauntLine(indexRef.current)
    indexRef.current = index
    setLine(next)
    onHauntRef.current(next)
    window.clearTimeout(dismissRef.current)
    dismissRef.current = window.setTimeout(() => setLine(null), HAUNT_LINE_MS)
  }, [])

  // Automatic haunts: first one after a grace period, then on cadence.
  // Skips a tick while the tab is hidden; re-arms after a manual haunt so
  // the two never fire back-to-back.
  useEffect(() => {
    if (!enabled) return
    let timeoutId = window.setTimeout(function tick() {
      if (!document.hidden) trigger()
      timeoutId = window.setTimeout(tick, HAUNT_INTERVAL_MS)
    }, HAUNT_INITIAL_DELAY_MS)
    return () => window.clearTimeout(timeoutId)
  }, [enabled, resetKey, trigger])

  useEffect(() => () => window.clearTimeout(dismissRef.current), [])

  function handleManual() {
    trigger()
    // Push the next automatic haunt back to a full interval from now.
    setResetKey((k) => k + 1)
  }

  function handleToggle() {
    setEnabled((v) => {
      saveHauntEnabled(!v)
      return !v
    })
  }

  return (
    <div className="haunt">
      {line && (
        <div
          className="haunt__toast"
          role="status"
          onClick={() => setLine(null)}
          title="點一下消去"
        >
          <span className="haunt__toast-text">{line}</span>
          <span className="haunt__toast-dismiss" aria-hidden="true">
            ✕
          </span>
        </div>
      )}

      <div className="haunt__controls">
        <button
          type="button"
          className="haunt__button"
          onClick={handleManual}
          aria-label="讓管家現在作祟"
        >
          作祟
        </button>
        <button
          type="button"
          className="haunt__toggle"
          aria-pressed={enabled}
          aria-label={enabled ? '關閉自動作祟' : '開啟自動作祟'}
          onClick={handleToggle}
        >
          自動：{enabled ? '開' : '關'}
        </button>
      </div>
    </div>
  )
}
