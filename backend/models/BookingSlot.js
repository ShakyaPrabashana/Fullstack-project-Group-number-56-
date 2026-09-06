const mongoose = require('mongoose');

const bookingSlotSchema = new mongoose.Schema({
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  isBooked: { type: Boolean, default: false }
}, { timestamps: true });

bookingSlotSchema.index({ resource: 1, startTime: 1, endTime: 1 }, { unique: true });

module.exports = mongoose.model('BookingSlot', bookingSlotSchema);