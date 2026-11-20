import { useMemo, useState } from 'react'
import {
  formatTimeRange,
  sortByWhen,
  todayKey,
  validateEventInput,
  type EventInput,
  type ScheduleEvent,
} from '../lib/schedule'
import './ScheduleEditor.css'

interface ScheduleEditorProps {
  /** All stored events (the parent owns them). */
  events: ScheduleEvent[]
  /** Add a validated event; may throw, in which case the editor shows it. */
  onAdd: (input: EventInput) => void
  /** Replace an event; may throw. */
  onEdit: (id: string, input: EventInput) => void
  /** Delete an event by id. */
  onDelete: (id: string) => void
}

/** A blank form, with the date pre-filled to today when adding. */
function blankForm(): EventInput {
  return { title: '', date: todayKey(), startTime: '', endTime: '', note: '' }
}

/**
 * Corner editor control: a subtle toggle that opens a phosphor-styled panel
 * for managing the butler's schedule. Lists all events (date + time order),
 * with an add/edit form and an inline delete confirm. UI strings are English;
 * only the mirror's butler-facing lines are Traditional Chinese.
 */
export default function ScheduleEditor({ events, onAdd, onEdit, onDelete }: ScheduleEditorProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<EventInput>(blankForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const sorted = useMemo(() => sortByWhen(events), [events])

  function resetForm() {
    setForm(blankForm())
    setEditingId(null)
    setError(null)
  }

  function startEdit(e: ScheduleEvent) {
    setEditingId(e.id)
    setForm({
      title: e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime ?? '',
      note: e.note ?? '',
    })
    setError(null)
  }

  function handleSubmit() {
    const err = validateEventInput(form)
    if (err) {
      setError(err)
      return
    }
    try {
      if (editingId) onEdit(editingId, form)
      else onAdd(form)
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the event.')
    }
  }

  function confirmDelete(id: string) {
    onDelete(id)
    setConfirmingId(null)
    if (editingId === id) resetForm()
  }

  const canSubmit = form.title.trim() !== '' && form.date !== '' && form.startTime !== ''

  return (
    <div className="sched">
      <button
        type="button"
        className="sched__toggle"
        aria-expanded={open}
        aria-controls="schedule-editor"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close' : 'Schedule'}
      </button>

      {open && (
        <div id="schedule-editor" className="sched__panel" role="dialog" aria-label="Schedule editor">
          <form
            className="sched__form"
            onSubmit={(e) => {
              e.preventDefault()
              if (canSubmit) handleSubmit()
            }}
          >
            <input
              type="text"
              className="sched__input sched__input--title"
              value={form.title}
              placeholder="Title"
              aria-label="Title"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <div className="sched__row">
              <input
                type="date"
                className="sched__input"
                value={form.date}
                aria-label="Date"
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
              <input
                type="time"
                className="sched__input"
                value={form.startTime}
                aria-label="Start time"
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
              <input
                type="time"
                className="sched__input"
                value={form.endTime ?? ''}
                aria-label="End time (optional)"
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <input
              type="text"
              className="sched__input"
              value={form.note ?? ''}
              placeholder="Note (optional)"
              aria-label="Note"
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
            {error && <p className="sched__error" role="alert">{error}</p>}
            <div className="sched__form-actions">
              <button type="submit" className="sched__btn sched__btn--primary" disabled={!canSubmit}>
                {editingId ? 'Save' : 'Add event'}
              </button>
              {editingId && (
                <button type="button" className="sched__btn" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {sorted.length === 0 ? (
            <p className="sched__empty">No events yet.</p>
          ) : (
            <ul className="sched__list">
              {sorted.map((e) => (
                <li
                  key={e.id}
                  className={`sched__item${editingId === e.id ? ' sched__item--editing' : ''}`}
                >
                  {confirmingId === e.id ? (
                    <div className="sched__confirm">
                      <span className="sched__confirm-text">Delete this event?</span>
                      <button
                        type="button"
                        className="sched__btn sched__btn--danger"
                        onClick={() => confirmDelete(e.id)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="sched__btn"
                        onClick={() => setConfirmingId(null)}
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="sched__item-main">
                        <p className="sched__item-when">
                          <span className="sched__item-date">{e.date}</span>
                          {' '}
                          <span className="sched__item-time">{formatTimeRange(e)}</span>
                        </p>
                        <p className="sched__item-title">{e.title}</p>
                        {e.note && <p className="sched__item-note">{e.note}</p>}
                      </div>
                      <div className="sched__item-actions">
                        <button type="button" className="sched__btn" onClick={() => startEdit(e)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="sched__btn"
                          onClick={() => setConfirmingId(e.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
