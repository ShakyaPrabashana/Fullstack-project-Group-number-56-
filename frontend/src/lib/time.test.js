import { describe, expect, it } from 'vitest'
import { SLOTS, addMinutes, colOf, fitsInDay, formatDuration, overlaps, spanOf, toMin } from './time'

describe('time maths', () => {
  it('covers 08:00 to 20:00 in half-hour columns', () => {
    expect(SLOTS).toBe(24)
  })

  it('places a time in the right grid column, allowing for the resource column', () => {
    expect(colOf('08:00')).toBe(2)
    expect(colOf('08:30')).toBe(3)
    expect(colOf('19:30')).toBe(25)
  })

  it('spans a booking across the half-hours it covers', () => {
    expect(spanOf('10:00', '11:00')).toBe(2)
    expect(spanOf('13:00', '16:00')).toBe(6)
  })

  it('treats touching bookings as free, not clashing', () => {
    // 10:00–11:00 and 11:00–12:00 share an edge but no time.
    expect(overlaps('10:00', '11:00', '11:00', '12:00')).toBe(false)
    expect(overlaps('10:00', '11:00', '10:30', '11:30')).toBe(true)
    expect(overlaps('10:00', '12:00', '10:30', '11:00')).toBe(true)
  })

  it('refuses durations that run past the end of the bookable day', () => {
    expect(fitsInDay('18:00', 120)).toBe(true)
    expect(fitsInDay('19:00', 120)).toBe(false)
  })

  it('reads durations the way a person would say them', () => {
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(60)).toBe('1 hr')
    expect(formatDuration(90)).toBe('1 hr 30 min')
  })

  it('adds minutes across the hour boundary', () => {
    expect(addMinutes('09:30', 60)).toBe('10:30')
    expect(toMin(addMinutes('08:00', 90))).toBe(toMin('09:30'))
  })
})
