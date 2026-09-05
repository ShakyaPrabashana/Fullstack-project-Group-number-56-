import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../api/client'
import { connect } from '../lib/live'

const BookingsContext = createContext(null)

export function BookingsProvider({ children }) {
  const [bookings, setBookings] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [liveBump, setLiveBump] = useState(null) // id of a booking that arrived from elsewhere

  const timer = useRef(null)
  // Mirrors `bookings` so refresh can diff against the current list without
  // doing the comparison inside a state updater, which React may run twice.
  const known = useRef([])

  useEffect(() => {
    known.current = bookings
  }, [bookings])

  const announce = useCallback((tone, message) => {
    setNotice({ tone, message, at: Date.now() })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(null), 5000)
  }, [])

  /** Pull the board from the server. `bump` highlights anything that appeared since. */
  const refresh = useCallback(async ({ bump = false } = {}) => {
    const next = await api.listBookings()

    if (bump) {
      const seen = new Set(known.current.map((b) => b.id))
      const arrived = next.find((b) => !seen.has(b.id))
      if (arrived) {
        setLiveBump(arrived.id)
        setTimeout(() => setLiveBump(null), 2500)
      }
    }

    setBookings(next)
    return next
  }, [])

  useEffect(() => {
    let alive = true

    Promise.all([api.listResources(), api.listBookings()])
      .then(([r, b]) => {
        if (!alive) return
        setResources(r)
        setBookings(b)
      })
      .catch((err) => {
        // Without this the board would spin forever when the API is down.
        if (!alive) return
        announce('bad', err.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
      clearTimeout(timer.current)
    }
  }, [announce])

  /* Someone changed the board. Re-read from the API rather than trusting the
     broadcast payload, so the database stays the single source of truth — the
     event is a nudge to refetch, not data in its own right. */
  useEffect(() => {
    return connect((message) => {
      if (message?.type !== 'bookings:changed') return

      // Do not pulse your own change back at you; you have already seen it.
      const me = api.currentUser()
      const mine = me && message.actorId === me.id

      refresh({ bump: !mine }).catch(() => {
        /* a failed background refresh should not break the page */
      })
    })
  }, [refresh])

  const book = useCallback(
    async (draft) => {
      const result = await api.createBooking(draft)

      if (result.ok) {
        await refresh()
        announce('good', `Booked ${draft.resourceId}, ${draft.start} to ${draft.end}.`)
      } else if (result.conflict) {
        // Someone got there first. Take the server's version rather than overwrite it.
        await refresh()
      } else {
        announce('bad', result.error)
      }

      return result
    },
    [announce, refresh],
  )

  const cancel = useCallback(
    async (id) => {
      const result = await api.cancelBooking(id)
      await refresh()

      if (result.ok) announce('good', 'Booking cancelled.')
      else announce('bad', result.error)

      return result
    },
    [announce, refresh],
  )

  const value = useMemo(
    () => ({ bookings, resources, loading, notice, liveBump, book, cancel, announce, refresh }),
    [bookings, resources, loading, notice, liveBump, book, cancel, announce, refresh],
  )

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
}

export function useBookings() {
  const ctx = useContext(BookingsContext)
  if (!ctx) throw new Error('useBookings must be used inside BookingsProvider')
  return ctx
}
