const mongoose = require('mongoose')

/**
 * The concurrency guard (brief: "detecting a conflicting update and surfacing it
 * rather than silently overwriting data").
 *
 * One document per half-hour a booking occupies, keyed by resource+day+time. A
 * document's _id is unique by definition in MongoDB — including on a plain
 * standalone instance, with no replica set or multi-document transaction needed —
 * so two requests racing to claim the same half-hour cannot both succeed: the
 * second insert fails with a duplicate-key error the moment it happens.
 *
 * bookingController.createBooking claims every slot a new booking needs in one
 * insertMany before the Booking document itself is written. If any slot is
 * already taken, the whole attempt is rolled back and the caller is told which
 * existing booking holds it — never overwritten.
 */
const bookingSlotSchema = new mongoose.Schema({
  _id: { type: String }, // `${resourceId}::${day}::${start}`
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Booking' },
})

module.exports = mongoose.model('BookingSlot', bookingSlotSchema)
