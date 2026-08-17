import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../api/client'
import { connect } from '../lib/live'
import { RESOURCES } from '../data/resources'

const BookingsContext = createContext(null)

export function BookingsProvider({ children }) {
  const [bookings, setBookings] = useState([])
  const [resources, setResources] = useState(RESOURCES)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [liveBump, setLiveBump] = useState(null) // id of a booking that just arrived from elsewhere

  const timer = useRef(null)

  const announce = useCallback((tone, message) => {
    setNotice({ tone, message, at: Date.now() })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(null), 5000)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([api.listResources(), api.listBookings()]).then(([r, b]) => {
      if (!alive) return
      setResources(r)
      setBookings(b)
      setLoading(false)
    })
    return () => {
      alive = false
      clearTimeout(timer.current)
    }
  }, [])

  /* Another client changed something — merge it in and flag what arrived. */
  useEffect(() => {
    return connect((message) => {
      if (message?.type !== 'bookings:changed') return
      setBookings((prev) => {
        const known = new Set(prev.map((b) => b.id))
        const arrived = message.bookings.find((b) => !known.has(b.id))
        if (arrived) {
          setLiveBump(arrived.id)
          setTimeout(() => setLiveBump(null), 2500)
        }
        return message.bookings
      })
    })
  }, [])

  const book = useCallback(
    async (draft, user) => {
      const result = await api.createBooking(draft, user)
      if (result.ok) {
        setBookings(api.readBookings())
        announce('good', `Booked ${draft.resourceId}, ${draft.start} to ${draft.end}.`)
      } else if (result.conflict) {
        // Someone got there first. Take their version rather than overwrite it.
        setBookings(api.readBookings())
      }
      return result
    },
    [announce],
  )

  const cancel = useCallback(
    async (id, user) => {
      const result = await api.cancelBooking(id, user)
      setBookings(api.readBookings())
      if (result.ok) announce('good', 'Booking cancelled.')
      else announce('bad', result.error)
      return result
    },
    [announce],
  )

  const value = useMemo(
    () => ({ bookings, resources, loading, notice, liveBump, book, cancel, announce }),
    [bookings, resources, loading, notice, liveBump, book, cancel, announce],
  )

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
}

export function useBookings() {
  const ctx = useContext(BookingsContext)
  if (!ctx) throw new Error('useBookings must be used inside BookingsProvider')
  return ctx
}
