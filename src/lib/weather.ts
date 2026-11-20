/*
 * Weather fetch + cache for the Ghost-Butler Smart Mirror (milestone M2).
 * Uses the free Open-Meteo APIs (no API key):
 *   - Geocoding: https://geocoding-api.open-meteo.com/v1/search
 *   - Forecast:  https://api.open-meteo.com/v1/forecast
 * Plain logic (no React) so it can be reasoned about independently of the UI.
 * Persistence goes through localStorage.
 */

/** A resolved place: coordinates plus a display name. */
export interface GeoLocation {
  /** Open-Meteo geocoding id, when the place came from a search. */
  id?: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

/** Current-condition snapshot (only the fields we display). */
export interface CurrentWeather {
  temperature: number // °C
  weatherCode: number // WMO code
}

/** Today's summary: dominant condition plus the day's high and low. */
export interface TodayWeather {
  weatherCode: number
  tempMax: number // °C
  tempMin: number // °C
}

/** A full weather snapshot, exactly what gets cached. */
export interface WeatherSnapshot {
  location: GeoLocation
  current: CurrentWeather
  today: TodayWeather
  fetchedAt: number // epoch ms when successfully fetched
}

export type WeatherStatus = 'live' | 'cached' | 'unavailable'

export interface WeatherResult {
  snapshot: WeatherSnapshot | null
  status: WeatherStatus
}

/** Taipei, the mirror's default home (matches the Open-Meteo geocoding hit). */
export const DEFAULT_LOCATION: GeoLocation = {
  id: 1668341,
  name: 'Taipei',
  latitude: 25.0531,
  longitude: 121.5264,
  country: 'Taiwan',
}

const LOCATION_KEY = 'ghost-butler:location:v1'
const WEATHER_KEY = 'ghost-butler:weather:v1'
/** Cache is considered fresh for 30 minutes. */
const FRESH_MS = 30 * 60 * 1000
const REQUEST_TIMEOUT_MS = 8000

/* ---------- WMO weather code → Traditional Chinese label ---------- */

const WMO_LABELS: Record<number, string> = {
  0: '晴朗',
  1: '大致晴朗',
  2: '多雲',
  3: '陰天',
  45: '霧',
  48: '凍霧',
  51: '輕毛毛雨',
  53: '中毛毛雨',
  55: '密毛毛雨',
  56: '凍毛毛雨',
  57: '密凍毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '凍小雨',
  67: '凍大雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '小陣雨',
  81: '中陣雨',
  82: '大陣雨',
  85: '小陣雪',
  86: '大陣雪',
  95: '雷暴',
  96: '雷暴冰雹',
  99: '強雷暴冰雹',
}

/** Human-readable Traditional Chinese label for a WMO weather code. */
export function weatherLabel(code: number): string {
  return WMO_LABELS[code] ?? '未知'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** An AbortSignal that fires after `ms`, with a cancel handle. */
function timeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(id) }
}

/** Two locations refer to the same place (by geocoding id, else ~0.1°). */
function sameLocation(a: GeoLocation, b: GeoLocation): boolean {
  if (isNumber(a.id) && isNumber(b.id)) return a.id === b.id
  return a.latitude.toFixed(1) === b.latitude.toFixed(1) && a.longitude.toFixed(1) === b.longitude.toFixed(1)
}

/* ---------- location persistence ---------- */

export function loadLocation(): GeoLocation {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return DEFAULT_LOCATION
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && typeof (parsed as GeoLocation).name === 'string' &&
      isNumber((parsed as GeoLocation).latitude) && isNumber((parsed as GeoLocation).longitude)) {
      return parsed as GeoLocation
    }
  } catch {
    // corrupt or unavailable storage → fall back to the default
  }
  return DEFAULT_LOCATION
}

export function saveLocation(location: GeoLocation): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
  } catch {
    // storage may be unavailable (private mode); the choice still works in-memory
  }
}

/* ---------- geocoding ---------- */

interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

interface GeocodingResponse {
  results?: GeocodingResult[]
}

/** Resolve a free-text city name to up to `count` candidate locations. */
export async function geocode(query: string, count = 5): Promise<GeoLocation[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', trimmed)
  url.searchParams.set('count', String(count))
  url.searchParams.set('format', 'json')
  const { signal, cancel } = timeoutSignal(REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`geocoding HTTP ${res.status}`)
    const data = (await res.json()) as GeocodingResponse
    return (data.results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      admin1: r.admin1,
    }))
  } finally {
    cancel()
  }
}

/* ---------- forecast ---------- */

interface ForecastResponse {
  current?: {
    temperature_2m?: number
    weather_code?: number
  }
  daily?: {
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
  }
}

function toSnapshot(data: ForecastResponse, location: GeoLocation): WeatherSnapshot {
  const cur = data.current
  const day = data.daily
  if (!cur || !day) throw new Error('incomplete forecast response')
  const todayCode = day.weather_code?.[0]
  const tempMax = day.temperature_2m_max?.[0]
  const tempMin = day.temperature_2m_min?.[0]
  if (!isNumber(cur.temperature_2m) || !isNumber(cur.weather_code) ||
      !isNumber(todayCode) || !isNumber(tempMax) || !isNumber(tempMin)) {
    throw new Error('missing forecast fields')
  }
  return {
    location,
    current: { temperature: cur.temperature_2m, weatherCode: cur.weather_code },
    today: { weatherCode: todayCode, tempMax, tempMin },
    fetchedAt: Date.now(),
  }
}

async function fetchWeather(location: GeoLocation): Promise<WeatherSnapshot> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(location.latitude))
  url.searchParams.set('longitude', String(location.longitude))
  url.searchParams.set('current', 'temperature_2m,weather_code')
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')
  const { signal, cancel } = timeoutSignal(REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`forecast HTTP ${res.status}`)
    return toSnapshot((await res.json()) as ForecastResponse, location)
  } finally {
    cancel()
  }
}

/* ---------- cache ---------- */

function isSnapshot(value: unknown): value is WeatherSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return isNumber(v.fetchedAt) &&
    typeof v.location === 'object' && v.location !== null &&
    typeof v.current === 'object' && v.current !== null &&
    typeof v.today === 'object' && v.today !== null
}

function readCache(): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(WEATHER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isSnapshot(parsed) ? (parsed as WeatherSnapshot) : null
  } catch {
    return null
  }
}

function writeCache(snapshot: WeatherSnapshot): void {
  try {
    localStorage.setItem(WEATHER_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore storage failures
  }
}

/* ---------- public entry point ---------- */

/**
 * Get the current weather for `location`, transparently using the cache:
 *   - fresh cache for the same place (≤ 30 min) → served without a request
 *   - live fetch succeeds → cached and returned as 'live'
 *   - fetch fails but matching cache exists → returned as 'cached'
 *   - fetch fails and no matching cache → returned as 'unavailable'
 *
 * This never throws: a degraded result always comes back.
 */
export async function getWeather(location: GeoLocation): Promise<WeatherResult> {
  const cached = readCache()
  const now = Date.now()

  if (
    cached &&
    sameLocation(cached.location, location) &&
    now - cached.fetchedAt < FRESH_MS
  ) {
    return { snapshot: cached, status: 'live' }
  }

  try {
    const snapshot = await fetchWeather(location)
    writeCache(snapshot)
    return { snapshot, status: 'live' }
  } catch {
    if (cached && sameLocation(cached.location, location)) {
      return { snapshot: cached, status: 'cached' }
    }
    return { snapshot: null, status: 'unavailable' }
  }
}
