import { useEffect, useMemo, useRef, useState } from 'react'
import './CrtEffects.css'
import {
  getWeather,
  loadLocation,
  saveLocation,
  weatherLabel,
  type GeoLocation,
  type WeatherResult,
  type WeatherSnapshot,
} from '../lib/weather'
import {
  addEvent,
  deleteEvent,
  editEvent,
  formatTimeRange,
  getEventsOnDate,
  loadEvents,
  todayKey,
  type EventInput,
  type ScheduleEvent,
} from '../lib/schedule'
import { primeSpeech } from '../lib/speech'
import ButlerChat from './ButlerChat'
import SpeechControls from './SpeechControls'
import WeatherPanel from './WeatherPanel'
import SettingsPanel from './SettingsPanel'
import TodaySchedule from './TodaySchedule'
import ScheduleEditor from './ScheduleEditor'

/** Static greeting from the butler, in Traditional Chinese. */
const GREETING = '晚安，主人。您的鏡中管家，隨侍在側。'

/** Refresh the weather at most this often in the background. */
const REFRESH_MS = 30 * 60 * 1000

function formatClock(now: Date): string {
  return now.toLocaleTimeString('en-US', { hour12: false })
}

function formatDate(now: Date): string {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Compose the spoken opening briefing in the butler's Traditional Chinese
 * voice: greeting, today's weather, and today's schedule. Built from the same
 * live state the mirror face shows, so what is spoken matches what is read.
 */
function buildBriefing(
  snapshot: WeatherSnapshot | null,
  todays: ScheduleEvent[],
): string {
  const parts: string[] = [GREETING]
  if (!snapshot) {
    parts.push('天色尚未映入鏡中，稍候再為您探看。')
  } else {
    const { location, current, today } = snapshot
    parts.push(
      `${location.name}此刻約${Math.round(current.temperature)}度，${weatherLabel(current.weatherCode)}。`,
      `今日最高約${Math.round(today.tempMax)}度、最低約${Math.round(today.tempMin)}度。`,
    )
  }
  if (todays.length === 0) {
    parts.push('今日尚無行程，主人請安心歇息。')
  } else {
    const lines = todays.map((e) => `${formatTimeRange(e)} ${e.title}`)
    parts.push(`今日共${todays.length}件行程：${lines.join('，')}。`)
  }
  return parts.join('')
}

/** Ghost-butler portrait drawn as inline SVG (no external image). */
function GhostButler() {
  return (
    <svg
      className="ghost"
      viewBox="0 0 220 280"
      role="img"
      aria-label="Ghost butler portrait"
    >
      {/* Top hat */}
      <ellipse className="ghost__brim" cx="110" cy="64" rx="52" ry="7" />
      <rect className="ghost__crown" x="82" y="16" width="56" height="46" rx="4" />
      <rect className="ghost__band" x="82" y="52" width="56" height="9" />

      {/* Body with a wavy ghost tail */}
      <path
        className="ghost__body"
        d="M60,120 C60,92 82,78 110,78 C138,78 160,92 160,120 L160,200 Q150,222 140,204 Q130,222 120,204 Q110,222 100,204 Q90,222 80,204 Q70,222 60,200 Z"
      />

      {/* Eyes */}
      <circle className="ghost__eye" cx="92" cy="118" r="8" />
      <circle className="ghost__pupil" cx="92" cy="118" r="2.4" />
      <circle className="ghost__eye" cx="128" cy="118" r="8" />
      <circle className="ghost__pupil" cx="128" cy="118" r="2.4" />

      {/* Monocle over the right eye, with a dangling cord */}
      <circle className="ghost__monocle" cx="128" cy="118" r="15" />
      <path className="ghost__cord" d="M128,133 C140,150 150,160 150,176" />

      {/* A faint smile */}
      <path className="ghost__mouth" d="M100,140 Q110,150 120,140" />

      {/* Bow tie */}
      <path
        className="ghost__bow"
        d="M110,168 L88,152 L88,184 Z M110,168 L132,152 L132,184 Z"
      />
      <rect className="ghost__knot" x="106" y="161" width="8" height="14" rx="2" />
    </svg>
  )
}

export default function MirrorFace() {
  const [now, setNow] = useState(() => new Date())
  const [location, setLocation] = useState<GeoLocation>(() => loadLocation())
  const [result, setResult] = useState<WeatherResult | null>(null)
  const [loading, setLoading] = useState(true)
  const resultRef = useRef<WeatherResult | null>(null)
  const briefedRef = useRef(false)
  const [events, setEvents] = useState<ScheduleEvent[]>(() => loadEvents())

  // Today's events, recomputed only when the stored set or the calendar day
  // changes (not every tick). Shared by the mirror face and the butler chat so
  // both answer from the one live source of truth.
  const dateKey = todayKey(now)
  const todays = useMemo(() => getEventsOnDate(events, dateKey), [events, dateKey])

  // Tick once per second, aligned to the wall-clock second boundary.
  useEffect(() => {
    let intervalId: number | undefined
    const timeoutId = window.setTimeout(() => {
      setNow(new Date())
      intervalId = window.setInterval(() => setNow(new Date()), 1000)
    }, 1000 - (Date.now() % 1000))
    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [])

  // Load weather whenever the city changes (also the initial load). The reset
  // to "loading" happens in the change handler (an event), not here; this effect
  // only kicks off the fetch and updates state once it resolves.
  useEffect(() => {
    let cancelled = false
    resultRef.current = null
    getWeather(location)
      .then((r) => {
        if (cancelled) return
        resultRef.current = r
        setResult(r)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [location])

  // Silent background refresh: every 30 min, and whenever the tab returns to
  // view or the browser comes back online. Skips the loading flash. The
  // `active` flag discards any refresh that was in flight when the city changed.
  useEffect(() => {
    let active = true
    const refresh = () => {
      if (!active || !resultRef.current?.snapshot) return
      getWeather(location).then((r) => {
        if (!active) return
        resultRef.current = r
        setResult(r)
      })
    }
    const intervalId = window.setInterval(refresh, REFRESH_MS)
    const onOnline = () => refresh()
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [location])

  // Speak the opening briefing once, after the first weather attempt
  // resolves (so the weather line is included). Browsers block speech before a
  // user gesture; primeSpeech falls back to the first click/tap in that case.
  // The ref guards it to a single briefing for the session.
  useEffect(() => {
    if (briefedRef.current || loading) return
    briefedRef.current = true
    primeSpeech(buildBriefing(result?.snapshot ?? null, todays))
  }, [result, loading, todays])

  // Schedule mutations go through the lib (which validates + persists), then
  // the parent re-reads so the mirror face and editor stay in sync. Throws
  // surface to the editor, which shows the message.
  function handleAdd(input: EventInput) {
    addEvent(input)
    setEvents(loadEvents())
  }
  function handleEdit(id: string, input: EventInput) {
    editEvent(id, input)
    setEvents(loadEvents())
  }
  function handleDelete(id: string) {
    deleteEvent(id)
    setEvents(loadEvents())
  }

  return (
    <div className="crt">
      <div className="crt__scanlines" aria-hidden="true" />
      <div className="crt__flicker" aria-hidden="true" />
      <div className="crt__vignette" aria-hidden="true" />

      <main className="mirror">
        <GhostButler />
        <p className="mirror__greeting">{GREETING}</p>
        <time className="mirror__clock" dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>
        <time className="mirror__date" dateTime={now.toISOString()}>
          {formatDate(now)}
        </time>
        <WeatherPanel result={result} loading={loading} cityName={location.name} />
        <TodaySchedule events={events} now={now} />
      </main>

      <SpeechControls />

      <SettingsPanel
        location={location}
        onChange={(loc) => {
          saveLocation(loc)
          // Reset to the loading line for the new city, from the event that
          // caused the change rather than from the fetch effect.
          setResult(null)
          setLoading(true)
          setLocation(loc)
        }}
      />

      <ScheduleEditor
        events={events}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ButlerChat
        weather={result?.snapshot ?? null}
        events={todays}
        now={now}
      />
    </div>
  )
}
