/*
 * Schedule event storage for the Ghost-Butler Smart Mirror (milestone M3).
 * Plain logic (no React) so it can be reasoned about independently of the UI.
 * Events are persisted in localStorage and survive reloads.
 *
 * A date is stored as a local "YYYY-MM-DD" string and a time as "HH:MM" (24h),
 * so values never shift across timezones. .ics import is intentionally NOT
 * supported: parsing iCalendar correctly — timezone TZID, UTC "Z" suffixes,
 * all-day DATE values, line unfolding, and RRULE recurrence — is not trivial
 * without a date/ics library, and the milestone keeps to "no new libraries".
 */

/** A persisted schedule event. */
export interface ScheduleEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD (local calendar date)
  startTime: string // HH:MM, 24-hour
  endTime?: string // HH:MM, 24-hour; omitted when absent
  note?: string
}

/** Input shape for add/edit: end time and note are optional and may be blank. */
export interface EventInput {
  title: string
  date: string
  startTime: string
  endTime?: string
  note?: string
}

const STORAGE_KEY = 'ghost-butler:schedule:v1'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

/* ---------- ids ---------- */

function createId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through to a manual id
  }
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/* ---------- date helpers ---------- */

/** Local calendar date as "YYYY-MM-DD" (no UTC shifting). */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** A real calendar date (rejects 2024-02-30-style roll-overs). */
function validDate(s: string): boolean {
  const parts = s.split('-').map(Number)
  const [y, m, d] = parts
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** A real 24-hour time HH:MM. */
function validTime(s: string): boolean {
  const parts = s.split(':').map(Number)
  const [h, mm] = parts
  return h >= 0 && h < 24 && mm >= 0 && mm < 60
}

/* ---------- normalization + validation ---------- */

/** Trim text and drop blank optional fields. */
function normalize(input: EventInput): EventInput {
  return {
    title: input.title.trim(),
    date: input.date.trim(),
    startTime: input.startTime.trim(),
    endTime: input.endTime?.trim() || undefined,
    note: input.note?.trim() || undefined,
  }
}

/** Returns an English error message, or null when the input is valid. */
export function validateEventInput(input: EventInput): string | null {
  const v = normalize(input)
  if (!v.title) return 'Title is required.'
  if (!DATE_RE.test(v.date)) return 'Date is required (YYYY-MM-DD).'
  if (!validDate(v.date)) return 'Date is not a real calendar date.'
  if (!TIME_RE.test(v.startTime)) return 'Start time is required (HH:MM).'
  if (!validTime(v.startTime)) return 'Start time is not a real time.'
  if (v.endTime !== undefined) {
    if (!TIME_RE.test(v.endTime)) return 'End time must be HH:MM.'
    if (!validTime(v.endTime)) return 'End time is not a real time.'
    if (v.endTime <= v.startTime) return 'End time must be after start time.'
  }
  return null
}

/* ---------- persistence ---------- */

function isEvent(value: unknown): value is ScheduleEvent {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  return typeof e.id === 'string' && typeof e.title === 'string' &&
    typeof e.date === 'string' && typeof e.startTime === 'string' &&
    (e.endTime === undefined || typeof e.endTime === 'string') &&
    (e.note === undefined || typeof e.note === 'string')
}

/** All events from storage (validated), or [] when none/unavailable. */
export function loadEvents(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEvent)
  } catch {
    // corrupt or unavailable storage → treat as empty
    return []
  }
}

function saveEvents(events: ScheduleEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // storage may be unavailable (private mode); changes stay in-memory only
  }
}

/* ---------- CRUD ---------- */

/** Add an event. Throws on invalid input. Returns the created event. */
export function addEvent(input: EventInput): ScheduleEvent {
  const err = validateEventInput(input)
  if (err) throw new Error(err)
  const v = normalize(input)
  const event: ScheduleEvent = { id: createId(), ...v }
  saveEvents([...loadEvents(), event])
  return event
}

/** Replace an event's fields. Throws if missing or invalid. Returns updated. */
export function editEvent(id: string, input: EventInput): ScheduleEvent {
  const err = validateEventInput(input)
  if (err) throw new Error(err)
  const events = loadEvents()
  if (!events.some((e) => e.id === id)) throw new Error('Event not found.')
  const updated: ScheduleEvent = { id, ...normalize(input) }
  saveEvents(events.map((e) => (e.id === id ? updated : e)))
  return updated
}

/** Remove an event by id. No-op if it does not exist. */
export function deleteEvent(id: string): void {
  saveEvents(loadEvents().filter((e) => e.id !== id))
}

/* ---------- queries ---------- */

/** Events on a given "YYYY-MM-DD" key, sorted by start time. */
export function getEventsOnDate(events: ScheduleEvent[], dateKey: string): ScheduleEvent[] {
  return events
    .filter((e) => e.date === dateKey)
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** Today's events, sorted by start time. */
export function getTodayEvents(events: ScheduleEvent[], now: Date = new Date()): ScheduleEvent[] {
  return getEventsOnDate(events, todayKey(now))
}

/** All events sorted by date then start time (for the editor list). */
export function sortByWhen(events: ScheduleEvent[]): ScheduleEvent[] {
  return events
    .slice()
    .sort((a, b) => (a.date + ' ' + a.startTime).localeCompare(b.date + ' ' + b.startTime))
}

/* ---------- display helpers ---------- */

/** "HH:MM", or "HH:MM – HH:MM" when an end time is set. */
export function formatTimeRange(event: ScheduleEvent): string {
  return event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime
}
