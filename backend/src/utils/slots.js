/**
 * Time-slot rules. These constants must match frontend/src/lib/time.js exactly —
 * the two sides agree on what a "slot" is without either calling the other.
 */
const SLOT_MIN = 30
const DAY_START = 8 * 60 // 08:00
const DAY_END = 20 * 60 // 20:00

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):(00|30)$/

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function isValidDay(value) {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function isValidTime(value) {
  return typeof value === 'string' && TIME_RE.test(value)
}

/**
 * The half-hour slot keys a booking occupies, e.g. slotsBetween('13:00','14:00')
 * -> ['13:00', '13:30']. Each key is later used as part of a unique index, which
 * is what actually prevents two bookings from ever claiming the same half-hour.
 */
function slotsBetween(start, end) {
  const keys = []
  for (let t = toMin(start); t < toMin(end); t += SLOT_MIN) {
    const h = String(Math.floor(t / 60)).padStart(2, '0')
    const m = String(t % 60).padStart(2, '0')
    keys.push(`${h}:${m}`)
  }
  return keys
}

/** A window is bookable when it sits inside 08:00–20:00, on half-hour boundaries, start < end. */
function isBookableWindow(start, end) {
  if (!isValidTime(start) || !isValidTime(end)) return false
  const s = toMin(start)
  const e = toMin(end)
  return s < e && s >= DAY_START && e <= DAY_END
}

module.exports = {
  SLOT_MIN,
  DAY_START,
  DAY_END,
  toMin,
  isValidDay,
  isValidTime,
  isBookableWindow,
  slotsBetween,
}
