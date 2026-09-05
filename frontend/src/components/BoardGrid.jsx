import { useMemo } from 'react'
import {
  DAY_START,
  HOUR_TIMES,
  SLOTS,
  SLOT_MIN,
  SLOT_TIMES,
  colOf,
  nowOffset,
  spanOf,
  toMin,
} from '../lib/time'

function slotRange(booking) {
  return [
    Math.max(0, (toMin(booking.start) - DAY_START) / SLOT_MIN),
    Math.min(SLOTS, (toMin(booking.end) - DAY_START) / SLOT_MIN),
  ]
}

function Bar({ booking, row, mine, arrived, onClick }) {
  const label = `${booking.start}–${booking.end}, ${mine ? 'your booking' : `held by ${booking.userName}`}: ${booking.purpose}`
  return (
    <button
      type="button"
      className={[
        'bar',
        mine ? 'bar--mine' : 'bar--taken',
        arrived ? 'bar--arrived' : '',
      ].join(' ').trim()}
      style={{ gridRow: row, gridColumn: `${colOf(booking.start)} / span ${spanOf(booking.start, booking.end)}` }}
      onClick={() => onClick(booking)}
      title={label}
      aria-label={label}
    >
      <span className="bar__who">{mine ? 'You' : booking.userName}</span>
      <span className="bar__what">{booking.purpose}</span>
    </button>
  )
}

export default function BoardGrid({
  resources,
  bookings,
  userId,
  draft,
  day,
  isToday,
  liveBump,
  onPickSlot,
  onOpenResource,
  onOpenBooking,
}) {
  const byResource = useMemo(() => {
    const map = new Map(resources.map((r) => [r.id, []]))
    for (const b of bookings) {
      if (b.day === day && map.has(b.resourceId)) map.get(b.resourceId).push(b)
    }
    return map
  }, [resources, bookings, day])

  const nowPct = isToday ? nowOffset() : null

  if (resources.length === 0) {
    return (
      <div className="board board--empty">
        <p className="board__none">
          No resource matches those filters. Widen the capacity or clear the search to see
          the full list.
        </p>
      </div>
    )
  }

  return (
    <div className="board">
      <div className="board__scroll">
        <div
          className="board__grid"
          style={{ gridTemplateRows: `auto repeat(${resources.length}, var(--row-h))` }}
        >
          {/* Header: hour marks only. Half-hours stay unlabelled. */}
          <span className="board__corner">Resource</span>
          {HOUR_TIMES.map((t) => (
            <span key={t} className="board__hour" style={{ gridColumn: `${colOf(t)} / span 2` }}>
              {t}
            </span>
          ))}

          {resources.map((res, ri) => {
            const row = ri + 2
            const held = byResource.get(res.id) ?? []
            const occupied = new Set()
            for (const b of held) {
              const [from, to] = slotRange(b)
              for (let i = from; i < to; i += 1) occupied.add(i)
            }

            return (
              <Fragmentish key={res.id}>
                <button
                  type="button"
                  className="res"
                  style={{ gridRow: row, gridColumn: 1 }}
                  onClick={() => onOpenResource(res)}
                >
                  <span className="res__id">{res.id}</span>
                  <span className="res__name">{res.name}</span>
                  <span className="res__meta">
                    {res.kind === 'Room' ? `Seats ${res.capacity}` : res.category} · {res.location}
                  </span>
                </button>

                {SLOT_TIMES.map((t, i) =>
                  occupied.has(i) ? (
                    <span
                      key={t}
                      className={i % 2 === 0 ? 'cell cell--hour cell--busy' : 'cell cell--busy'}
                      style={{ gridRow: row, gridColumn: i + 2 }}
                    />
                  ) : (
                    <button
                      key={t}
                      type="button"
                      tabIndex={-1}
                      className={i % 2 === 0 ? 'cell cell--hour' : 'cell'}
                      style={{ gridRow: row, gridColumn: i + 2 }}
                      onClick={() => onPickSlot(res, t)}
                      aria-label={`${res.name} at ${t}, free`}
                    />
                  ),
                )}

                {held.map((b) => (
                  <Bar
                    key={b.id}
                    booking={b}
                    row={row}
                    mine={b.userId === userId}
                    arrived={b.id === liveBump}
                    onClick={onOpenBooking}
                  />
                ))}

                {draft && draft.resourceId === res.id && draft.day === day && (
                  <span
                    className="bar bar--draft"
                    style={{
                      gridRow: row,
                      gridColumn: `${colOf(draft.start)} / span ${spanOf(draft.start, draft.end)}`,
                    }}
                  >
                    <span className="bar__who">Choosing</span>
                    <span className="bar__what">
                      {draft.start}–{draft.end}
                    </span>
                  </span>
                )}
              </Fragmentish>
            )
          })}

          {nowPct !== null && (
            <span className="nowlayer" style={{ gridColumn: '2 / -1', gridRow: '1 / -1' }}>
              <span className="nowline" style={{ left: `${nowPct}%` }}>
                <span className="nowline__dot" />
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* Grid children must be direct descendants, so rows are flattened with a fragment. */
function Fragmentish({ children }) {
  return <>{children}</>
}
