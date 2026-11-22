import { useSyncExternalStore } from 'react'
import {
  activeVoiceURI,
  getMutedSnapshot,
  getVoiceStateSnapshot,
  setMuted,
  setSelectedVoiceURI,
  subscribeMute,
  subscribeVoiceState,
} from '../lib/speech'
import './SpeechControls.css'

/**
 * Mute toggle + voice picker for the Ghost-Butler Smart Mirror (milestone M5),
 * in the top-left corner of the mirror face. The mute button stops all speech
 * immediately (including a line already playing); the picker lists the voices
 * the browser actually offers, defaulting to a Traditional Chinese one. Both
 * choices are persisted in localStorage via the speech module.
 */
export default function SpeechControls() {
  const muted = useSyncExternalStore(subscribeMute, getMutedSnapshot, getMutedSnapshot)
  const { voices } = useSyncExternalStore(
    subscribeVoiceState,
    getVoiceStateSnapshot,
    getVoiceStateSnapshot,
  )
  const activeURI = activeVoiceURI()

  return (
    <div className="speech">
      <button
        type="button"
        className={`speech__mute${muted ? ' speech__mute--muted' : ''}`}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute butler speech' : 'Mute butler speech'}
        onClick={() => setMuted(!muted)}
      >
        {muted ? 'Unmute' : 'Mute'}
      </button>

      <label className="speech__voice">
        <span className="speech__voice-label">Voice</span>
        <select
          className="speech__select"
          value={activeURI}
          disabled={voices.length === 0}
          aria-label="Butler voice"
          onChange={(e) => setSelectedVoiceURI(e.target.value)}
        >
          {voices.length === 0 ? (
            <option value="">No voices</option>
          ) : (
            voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  )
}
