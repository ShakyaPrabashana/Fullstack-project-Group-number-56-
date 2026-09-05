export const SLOT_MIN = 30
export const DAY_START = 8 * 60 // 08:00
export const DAY_END = 20 * 60 // 20:00
export const SLOTS = (DAY_END - DAY_START) / SLOT_MIN // 24 half-hour columns

export const DURATIONS = [30, 60, 90, 120, 180]

export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function fromMin(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Every bookable start time, 08:00 through 19:30. */
export const SLOT_TIMES = Array.from({ length: SLOTS }, (_, i) => fromMin(DAY_START + i * SLOT_MIN))

/** Column labels on the hour only — half-hours stay unlabelled to keep the board quiet. */
export const HOUR_TIMES = SLOT_TIMES.filter((t) => t.endsWith(':00'))

/** Grid column for a time. Column 1 is the sticky resource name. */
export function colOf(hhmm) {
  return (toMin(hhmm) - DAY_START) / SLOT_MIN + 2
}

export function spanOf(start, end) {
  return (toMin(end) - toMin(start)) / SLOT_MIN
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMin(aStart) < toMin(bEnd) && toMin(bStart) < toMin(aEnd)
}

export function addMinutes(hhmm, minutes) {
  return fromMin(toMin(hhmm) + minutes)
}

export function fitsInDay(start, minutes) {
  return toMin(start) + minutes <= DAY_END
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/* ---------- Dates ---------- */

export function isoDay(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayIso() {
  return isoDay(new Date())
}

/** The booking window: today plus the next `count - 1` days. */
export function bookableDays(count = 7) {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return {
      iso: isoDay(d),
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      isToday: i === 0,
    }
  })
}

export function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Minutes since midnight, right now — used to place the live "now" rule. */
export function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** How far across the board "now" sits, as a percentage. Null when off-board. */
export function nowOffset() {
  const m = nowMinutes()
  if (m < DAY_START || m > DAY_END) return null
  return ((m - DAY_START) / (DAY_END - DAY_START)) * 100
}

/** The next half-hour boundary from now, clamped into the bookable day. */
export function nextBookableStart() {
  const m = nowMinutes()
  const rounded = Math.ceil(m / SLOT_MIN) * SLOT_MIN
  if (rounded < DAY_START) return fromMin(DAY_START)
  if (rounded > DAY_END - SLOT_MIN) return fromMin(DAY_END - SLOT_MIN)
  return fromMin(rounded)
}

/**
 * The first start time on `day`, at or after `nextBookableStart()` (or the start of
 * the day for a future date), for which a `minutes`-long window doesn't overlap any
 * booking in `taken`. Returns null when nothing that long is free before DAY_END.
 */
export function firstFreeStart(day, taken, minutes = 60) {
  const earliest = day === todayIso() ? nextBookableStart() : fromMin(DAY_START)

  for (const start of SLOT_TIMES) {
    if (toMin(start) < toMin(earliest)) continue
    if (!fitsInDay(start, minutes)) break
    const end = addMinutes(start, minutes)
    if (!taken.some((b) => overlaps(start, end, b.start, b.end))) return start
  }
  return null
}
