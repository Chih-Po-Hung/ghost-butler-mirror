import { weatherLabel, type WeatherResult } from '../lib/weather'
import './Weather.css'

interface WeatherPanelProps {
  /** Latest weather result (null until the first fetch resolves). */
  result: WeatherResult | null
  /** True while the first load for the current city is in flight. */
  loading: boolean
  /** Display name of the currently chosen city. */
  cityName: string
}

/** Round a Celsius value to a whole-degree string, e.g. 15.1 → "15°". */
function formatTemp(value: number): string {
  return `${Math.round(value)}°`
}

/**
 * Weather readout for the mirror face: current temperature, a Traditional
 * Chinese condition label, and today's high/low. Falls back gracefully to a
 * loading line, a cached badge, or a butler-style unavailable line.
 */
export default function WeatherPanel({ result, loading, cityName }: WeatherPanelProps) {
  if (loading && (!result || !result.snapshot)) {
    return (
      <p className="weather weather--loading" aria-live="polite">
        天氣讀取中…
      </p>
    )
  }

  if (!result || !result.snapshot) {
    return (
      <p className="weather weather--unavailable" aria-live="polite">
        管家暫時無法取得天氣資訊，稍候再試。
      </p>
    )
  }

  const { snapshot, status } = result
  const { current, today } = snapshot

  return (
    <div className="weather" aria-live="polite">
      <p className="weather__city">{cityName}</p>
      <p className="weather__now">
        <span className="weather__temp">{formatTemp(current.temperature)}</span>
        <span className="weather__cond">{weatherLabel(current.weatherCode)}</span>
      </p>
      <p className="weather__range">
        今日　高 {formatTemp(today.tempMax)}　低 {formatTemp(today.tempMin)}
      </p>
      {status === 'cached' && <span className="weather__cached">快取資料</span>}
    </div>
  )
}
