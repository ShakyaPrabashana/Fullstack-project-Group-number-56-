const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const BookingSlot = require('../models/BookingSlot')
const Resource = require('../models/Resource')
const { isBookableWindow, isValidDay, slotsBetween } = require('../utils/slots')
const { announceBookingsChanged } = require('../realtime')

function toJSON(booking) {
  return {
    id: booking._id.toString(),
    resourceId: booking.resourceId,
    day: booking.day,
    start: booking.start,
    end: booking.end,
    purpose: booking.purpose,
    userId: booking.userId.toString(),
    userName: booking.userName,
  }
}

async function list(req, res, next) {
  try {
    const { day } = req.query
    if (day !== undefined && !isValidDay(day)) {
      return res.status(400).json({ message: 'day must be in YYYY-MM-DD format.' })
    }

    const bookings = await Booking.find(day ? { day } : {}).sort({ day: 1, start: 1 })
    res.json(bookings.map(toJSON))
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const { resourceId, day, start, end } = req.body
    const purpose = (req.body.purpose ?? '').trim()

    if (typeof resourceId !== 'string' || !resourceId) {
      return res.status(400).json({ message: 'resourceId is required.' })
    }
    if (!isValidDay(day)) {
      return res.status(400).json({ message: 'day must be a real calendar date, in YYYY-MM-DD format.' })
    }
    if (!isBookableWindow(start, end)) {
      return res.status(400).json({ message: 'Pick a window on the half-hour, between 08:00 and 20:00, that ends after it starts.' })
    }
    if (!purpose) {
      return res.status(400).json({ message: 'Say what the booking is for.' })
    }
    if (purpose.length > 120) {
      return res.status(400).json({ message: 'Keep the purpose under 120 characters.' })
    }

    const resource = await Resource.findById(resourceId)
    if (!resource) {
      return res.status(404).json({ message: `No resource with id ${resourceId}.` })
    }

    // Claim every half-hour the booking needs before it exists. A document's _id
    // is unique on any MongoDB instance, standalone or not, so if two requests
    // race for the same slot, only one insert can win it — no transaction needed.
    const bookingId = new mongoose.Types.ObjectId()
    const slotIds = slotsBetween(start, end).map((slot) => `${resourceId}::${day}::${slot}`)

    try {
      await BookingSlot.insertMany(
        slotIds.map((id) => ({ _id: id, bookingId })),
        { ordered: true },
      )
    } catch (err) {
      if (err.code !== 11000) throw err

      // Roll back whichever of our own slots made it in before the clash — never
      // touches slots that belong to the booking that actually got there first.
      await BookingSlot.deleteMany({ bookingId })

      const clash = await BookingSlot.findOne({ _id: { $in: slotIds } })
      const conflictBooking = clash ? await Booking.findById(clash.bookingId) : null

      return res.status(409).json({
        message: 'That window is not free.',
        conflict: conflictBooking ? toJSON(conflictBooking) : null,
      })
    }

    const booking = await Booking.create({
      _id: bookingId,
      resourceId,
      day,
      start,
      end,
      purpose,
      userId: req.user.id,
      userName: req.user.name,
    })

    // Announced only after the write succeeded, so clients are never told about
    // a booking that does not exist.
    announceBookingsChanged({ action: 'created', booking: toJSON(booking), actorId: req.user.id })

    res.status(201).json({ booking: toJSON(booking) })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ message: 'That booking is already gone. The board has been refreshed.' })
    }
    if (booking.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: `${booking.userName} owns that booking. You can only cancel your own.` })
    }

    const removed = toJSON(booking)
    await BookingSlot.deleteMany({ bookingId: booking._id })
    await booking.deleteOne()

    announceBookingsChanged({ action: 'cancelled', booking: removed, actorId: req.user.id })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { list, create, remove }
