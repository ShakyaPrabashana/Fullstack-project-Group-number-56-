import { useEffect, useMemo, useState } from 'react'
import BoardGrid from '../components/BoardGrid'
import BookingDrawer from '../components/BookingDrawer'
import DateStrip from '../components/DateStrip'
import Filters from '../components/Filters'
import { addMinutes, firstFreeStart, fitsInDay, nextBookableStart, todayIso } from '../lib/time'
import { useAuth } from '../state/AuthContext'
import { useBookings } from '../state/BookingsContext'
import { hadSavedDraft, useDraft } from '../state/useDraft'

function defaultEnd(start) {
  return fitsInDay(start, 60) ? addMinutes(start, 60) : addMinutes(start, 30)
}

export default function BoardPage() {
  const { user } = useAuth()
  const { bookings, resources, loading, liveBump, book, cancel, announce } = useBookings()

  const [day, setDay] = useState(todayIso)
  const [kind, setKind] = useState('All')
  const [query, setQuery] = useState('')
  const [minCapacity, setMinCapacity] = useState(1)

  const [draft, setDraft] = useDraft()
  const [view, setView] = useState(null)
  const [busy, setBusy] = useState(false)
  const [conflictSinceDraft, setConflictSinceDraft] = useState(false)

  // Tell people their unfinished booking survived, rather than leaving them to notice.
  useEffect(() => {
    if (hadSavedDraft()) {
      announce('info', 'Picked up the booking you had started.')
    }
    // Runs once on mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return resources.filter((r) => {
      if (kind !== 'All' && r.kind !== kind) return false
      if (r.capacity < minCapacity) return false
      if (!q) return true
      return [r.id, r.name, r.category, r.location, ...r.features]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [resources, kind, query, minCapacity])

  const countsByDay = useMemo(() => {
    const counts = {}
    for (const b of bookings) counts[b.day] = (counts[b.day] ?? 0) + 1
    return counts
  }, [bookings])

  const panelResource = useMemo(() => {
    const id = view?.resourceId ?? draft?.resourceId
    return id ? (resources.find((r) => r.id === id) ?? null) : null
  }, [view, draft, resources])

  function startDraft(resource, start) {
    setView(null)
    setConflictSinceDraft(false)
    setDraft({
      resourceId: resource.id,
      day,
      start,
      end: defaultEnd(start),
      purpose: draft?.purpose ?? '',
    })
  }

  function openBooking(booking) {
    setView({ ...booking, mine: booking.userId === user.id })
  }

  function closePanel() {
    setView(null)
    setDraft(null)
    setConflictSinceDraft(false)
  }

  async function confirm() {
    setBusy(true)
    const result = await book(draft)
    setBusy(false)
    if (result.ok) {
      setDraft(null)
      setConflictSinceDraft(false)
    } else if (result.conflict) {
      // Somebody claimed it between opening the draft and confirming.
      setConflictSinceDraft(true)
    }
  }

  async function removeBooking(id) {
    setBusy(true)
    await cancel(id)
    setBusy(false)
    setView(null)
  }

  return (
    <div className={draft || view ? 'layout layout--panel' : 'layout'}>
      <Filters
        kind={kind}
        onKind={setKind}
        query={query}
        onQuery={setQuery}
        minCapacity={minCapacity}
        onMinCapacity={setMinCapacity}
        shown={shown.length}
        total={resources.length}
      />

      <div className="main">
        <DateStrip day={day} onDay={setDay} countsByDay={countsByDay} />

        {loading ? (
          <p className="loading">Loading the board…</p>
        ) : (
          <BoardGrid
            resources={shown}
            bookings={bookings}
            userId={user.id}
            draft={draft}
            day={day}
            isToday={day === todayIso()}
            liveBump={liveBump}
            onPickSlot={startDraft}
            onOpenResource={(r) => {
              // Open on the resource's next genuinely free window, not just the
              // next half-hour on the clock.
              const takenToday = bookings.filter((b) => b.resourceId === r.id && b.day === day)
              startDraft(r, firstFreeStart(day, takenToday) ?? nextBookableStart())
            }}
            onOpenBooking={openBooking}
          />
        )}
      </div>

      {panelResource && (
        <BookingDrawer
          resource={panelResource}
          draft={draft}
          view={view}
          bookings={bookings}
          busy={busy}
          conflictSinceDraft={conflictSinceDraft}
          onChange={setDraft}
          onConfirm={confirm}
          onCancelBooking={removeBooking}
          onClose={closePanel}
        />
      )}
    </div>
  )
}
