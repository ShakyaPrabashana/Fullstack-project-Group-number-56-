import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { longDate, todayIso, toMin } from '../lib/time'
import { useAuth } from '../state/AuthContext'
import { useBookings } from '../state/BookingsContext'

export default function MyBookingsPage() {
  const { user } = useAuth()
  const { bookings, resources, cancel } = useBookings()
  const [busyId, setBusyId] = useState(null)

  const mine = useMemo(
    () =>
      bookings
        .filter((b) => b.userId === user.id)
        .sort((a, b) => a.day.localeCompare(b.day) || toMin(a.start) - toMin(b.start)),
    [bookings, user.id],
  )

  const today = todayIso()
  const upcoming = mine.filter((b) => b.day >= today)
  const past = mine.filter((b) => b.day < today)

  function resourceFor(id) {
    return resources.find((r) => r.id === id)
  }

  async function drop(id) {
    setBusyId(id)
    await cancel(id)
    setBusyId(null)
  }

  return (
    <div className="page">
      <header className="pagehead">
        <h1 className="pagehead__title">My bookings</h1>
        <p className="pagehead__sub">
          {upcoming.length === 0
            ? 'Nothing booked yet.'
            : `${upcoming.length} upcoming ${upcoming.length === 1 ? 'booking' : 'bookings'}.`}
        </p>
      </header>

      {upcoming.length === 0 ? (
        <div className="empty">
          <p className="empty__line">You have not booked anything yet.</p>
          <Link to="/" className="btn btn--go btn--inline">
            Find a free slot
          </Link>
        </div>
      ) : (
        <ul className="cards">
          {upcoming.map((b) => {
            const res = resourceFor(b.resourceId)
            return (
              <li key={b.id} className="card">
                <div className="card__top">
                  <span className="card__id">{b.resourceId}</span>
                  <span className="card__when">
                    {b.start}–{b.end}
                  </span>
                </div>
                <h2 className="card__name">{res?.name ?? b.resourceId}</h2>
                <p className="card__day">{longDate(b.day)}</p>
                <p className="card__purpose">{b.purpose}</p>
                <p className="card__where">{res?.location}</p>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={busyId === b.id}
                  onClick={() => drop(b.id)}
                >
                  {busyId === b.id ? 'Cancelling…' : 'Cancel booking'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {past.length > 0 && (
        <section className="past">
          <h2 className="past__title">Earlier</h2>
          <ul className="pastlist">
            {past.map((b) => (
              <li key={b.id} className="pastrow">
                <span className="pastrow__id">{b.resourceId}</span>
                <span className="pastrow__when">
                  {longDate(b.day)}, {b.start}–{b.end}
                </span>
                <span className="pastrow__purpose">{b.purpose}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
