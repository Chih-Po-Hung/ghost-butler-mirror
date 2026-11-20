import { useState } from 'react'
import { geocode, type GeoLocation } from '../lib/weather'
import './Settings.css'

interface SettingsPanelProps {
  /** The currently chosen city. */
  location: GeoLocation
  /** Called with a newly chosen location; the parent persists + reloads. */
  onChange: (location: GeoLocation) => void
}

/** Build a disambiguating region line, de-duplicating repeated values. */
function regionLine(r: GeoLocation): string {
  const parts: string[] = []
  if (r.admin1) parts.push(r.admin1)
  if (r.country && r.country !== r.admin1) parts.push(r.country)
  return parts.join('，')
}

/**
 * Corner settings control: a subtle toggle that opens a small panel for
 * changing the mirror's weather city. City names are resolved to coordinates
 * via the Open-Meteo geocoding API; the chosen candidate is handed back.
 */
export default function SettingsPanel({ location, onChange }: SettingsPanelProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoLocation[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    const trimmed = query.trim()
    if (!trimmed) return
    setSearching(true)
    setError(null)
    setResults([])
    try {
      const found = await geocode(trimmed)
      setResults(found)
      if (found.length === 0) setError('查無此地，請換個名稱再試。')
    } catch {
      setError('查詢失敗，請稍候再試。')
    } finally {
      setSearching(false)
    }
  }

  function handlePick(loc: GeoLocation) {
    onChange(loc)
    setOpen(false)
    setQuery('')
    setResults([])
    setError(null)
  }

  return (
    <div className="settings">
      <button
        type="button"
        className="settings__toggle"
        aria-expanded={open}
        aria-controls="weather-settings"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '關閉' : '設定'}
      </button>

      {open && (
        <div
          id="weather-settings"
          className="settings__panel"
          role="dialog"
          aria-label="天氣城市設定"
        >
          <p className="settings__current">
            目前城市：<span className="settings__city">{location.name}</span>
          </p>

          <div className="settings__search">
            <input
              type="text"
              className="settings__input"
              value={query}
              placeholder="輸入城市名稱"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSearch()
                }
              }}
              aria-label="城市名稱"
            />
            <button
              type="button"
              className="settings__button"
              onClick={() => void handleSearch()}
              disabled={searching || query.trim() === ''}
            >
              {searching ? '查詢中…' : '查詢'}
            </button>
          </div>

          {error && <p className="settings__error">{error}</p>}

          {results.length > 0 && (
            <ul className="settings__results">
              {results.map((r) => (
                <li key={`${r.id ?? `${r.latitude},${r.longitude}`}`}>
                  <button
                    type="button"
                    className="settings__result"
                    onClick={() => handlePick(r)}
                  >
                    <span className="settings__result-name">{r.name}</span>
                    <span className="settings__result-sub">{regionLine(r)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
