const mongoose = require('mongoose')

/**
 * userName is denormalised from User on purpose: the board displays "held by
 * <name>" on every booking bar, and a booking is a historical fact — if someone
 * later changes their display name, past bookings should still read as they were
 * made, not silently relabel themselves. userId is the real reference, kept for
 * ownership checks (only the owner may cancel).
 */
const bookingSchema = new mongoose.Schema(
  {
    resourceId: { type: String, required: true, ref: 'Resource' },
    day: { type: String, required: true }, // 'YYYY-MM-DD'
    start: { type: String, required: true }, // 'HH:MM'
    end: { type: String, required: true },
    purpose: { type: String, required: true, trim: true, maxlength: 120 },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    userName: { type: String, required: true },
  },
  { timestamps: true },
)

bookingSchema.index({ resourceId: 1, day: 1 })
bookingSchema.index({ userId: 1 })

module.exports = mongoose.model('Booking', bookingSchema)
