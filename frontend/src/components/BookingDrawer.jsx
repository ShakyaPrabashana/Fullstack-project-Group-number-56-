import { useEffect, useMemo, useRef } from 'react'
import {
  DURATIONS,
  SLOT_TIMES,
  addMinutes,
  bookableDays,
  fitsInDay,
  formatDuration,
  longDate,
  overlaps,
  toMin,
} from '../lib/time'

function Alert({ clash, sinceDraft }) {
  return (
    <div className="alert" role="alert">
      <p className="alert__head">
        {sinceDraft ? 'Taken while you were choosing' : 'That window is not free'}
      </p>
      <p className="alert__body">
        {clash.userName} has {clash.resourceId} from {clash.start} to {clash.end} for{' '}
        {clash.purpose}. Pick another time, or move to a different resource.
      </p>
    </div>
  )
}

export default function BookingDrawer({
  resource,
  draft,
  view,
  bookings,
  busy,
  conflictSinceDraft,
  onChange,
  onConfirm,
  onCancelBooking,
  onClose,
}) {
  const firstField = useRef(null)
  const days = bookableDays(7)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    firstField.current?.focus()
  }, [resource?.id, view?.id])

  const clash = useMemo(() => {
    if (!draft) return null
    return (
      bookings.find(
        (b) =>
          b.resourceId === draft.resourceId &&
          b.day === draft.day &&
          overlaps(draft.start, draft.end, b.start, b.end),
      ) ?? null
    )
  }, [draft, bookings])

  if (!resource) return null

  /* ---- Viewing an existing booking ---- */
  if (view) {
    return (
      <aside className="drawer" role="dialog" aria-modal="false" aria-label="Booking details">
        <div className="drawer__head">
          <div>
            <span className="drawer__id">{resource.id}</span>
            <h2 className="drawer__title">{resource.name}</h2>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>

        <dl className="facts">
          <div className="facts__row">
            <dt>When</dt>
            <dd>
              {longDate(view.day)}, {view.start}–{view.end}
            </dd>
          </div>
          <div className="facts__row">
            <dt>Held by</dt>
            <dd>{view.mine ? 'You' : view.userName}</dd>
          </div>
          <div className="facts__row">
            <dt>Purpose</dt>
            <dd>{view.purpose}</dd>
          </div>
          <div className="facts__row">
            <dt>Where</dt>
            <dd>{resource.location}</dd>
          </div>
        </dl>

        {view.mine ? (
          <button
            type="button"
            className="btn btn--danger"
            ref={firstField}
            disabled={busy}
            onClick={() => onCancelBooking(view.id)}
          >
            Cancel booking
          </button>
        ) : (
          <p className="drawer__note" ref={firstField} tabIndex={-1}>
            Only {view.userName} can release this slot. Choose a free window on the board
            instead.
          </p>
        )}
      </aside>
    )
  }

  /* ---- Creating a booking ---- */
  const duration = toMin(draft.end) - toMin(draft.start)
  const ready = draft.purpose.trim().length >= 3 && !clash

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-label="New booking">
      <div className="drawer__head">
        <div>
          <span className="drawer__id">{resource.id}</span>
          <h2 className="drawer__title">{resource.name}</h2>
        </div>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>

      <p className="drawer__where">
        {resource.location}
        {resource.kind === 'Room' ? ` · seats ${resource.capacity}` : ` · ${resource.category}`}
      </p>

      <ul className="chips">
        {resource.features.map((f) => (
          <li key={f} className="chip">
            {f}
          </li>
        ))}
      </ul>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) onConfirm()
        }}
      >
        <label className="field">
          <span className="field__label">Day</span>
          <select
            ref={firstField}
            className="input"
            value={draft.day}
            onChange={(e) => onChange({ ...draft, day: e.target.value })}
          >
            {days.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.isToday ? 'Today' : d.weekday}, {d.dayNum} {d.month}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Starts</span>
          <select
            className="input"
            value={draft.start}
            onChange={(e) =>
              onChange({
                ...draft,
                start: e.target.value,
                end: addMinutes(e.target.value, duration),
              })
            }
          >
            {SLOT_TIMES.filter((t) => fitsInDay(t, 30)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="field field--wide">
          <legend className="field__label">For</legend>
          <div className="segbar segbar--wrap">
            {DURATIONS.filter((m) => fitsInDay(draft.start, m)).map((m) => (
              <button
                key={m}
                type="button"
                className={m === duration ? 'seg seg--on' : 'seg'}
                aria-pressed={m === duration}
                onClick={() => onChange({ ...draft, end: addMinutes(draft.start, m) })}
              >
                {formatDuration(m)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field field--wide">
          <span className="field__label">What is it for</span>
          <input
            type="text"
            className="input"
            maxLength={80}
            placeholder="Group 56 sprint review"
            value={draft.purpose}
            onChange={(e) => onChange({ ...draft, purpose: e.target.value })}
          />
          <span className="field__help">
            Shown to anyone looking at the board, so they know who to ask.
          </span>
        </label>

        {clash ? (
          <Alert clash={clash} sinceDraft={conflictSinceDraft} />
        ) : (
          <p className="free" role="status">
            Free — {draft.start} to {draft.end} on {longDate(draft.day)}
          </p>
        )}

        <button type="submit" className="btn btn--go" disabled={!ready || busy}>
          {busy ? 'Booking…' : 'Confirm booking'}
        </button>
      </form>
    </aside>
  )
}
