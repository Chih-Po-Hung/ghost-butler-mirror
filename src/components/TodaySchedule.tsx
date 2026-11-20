import { useMemo } from 'react'
import {
  formatTimeRange,
  getEventsOnDate,
  todayKey,
  type ScheduleEvent,
} from '../lib/schedule'
import './TodaySchedule.css'

interface TodayScheduleProps {
  /** All stored events (the parent owns them; only today's are shown). */
  events: ScheduleEvent[]
  /** The live clock, so the day rolls over without a reload. */
  now: Date
}

/** Quiet butler line shown when there is nothing on the calendar today. */
const EMPTY_LINE = '今日尚無行程，主人請安心歇息。'

/**
 * Today's schedule on the mirror face: events in time order, drawn in the
 * same warm green phosphor as the rest of the screen. Falls back to a quiet
 * butler-style line when the day is clear.
 */
export default function TodaySchedule({ events, now }: TodayScheduleProps) {
  const dateKey = todayKey(now)
  const todays = useMemo(() => getEventsOnDate(events, dateKey), [events, dateKey])

  if (todays.length === 0) {
    return <p className="today today--empty">{EMPTY_LINE}</p>
  }

  return (
    <section className="today" aria-label="今日行程">
      <p className="today__heading">今日行程</p>
      <ul className="today__list">
        {todays.map((e) => (
          <li key={e.id} className="today__item">
            <span className="today__time">{formatTimeRange(e)}</span>
            <span className="today__title">{e.title}</span>
            {e.note && <span className="today__note">{e.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
