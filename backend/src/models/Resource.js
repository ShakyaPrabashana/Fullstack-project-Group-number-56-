const mongoose = require('mongoose')

/**
 * Resources use their human-readable code as the primary key (e.g. "LT-1") rather
 * than a generated ObjectId, so a Booking can reference one with a plain string
 * and the API keeps matching the id the frontend already displays everywhere.
 */
const resourceSchema = new mongoose.Schema({
  _id: { type: String },
  kind: { type: String, required: true, enum: ['Room', 'Equipment'] },
  category: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true, min: 1 },
  features: { type: [String], default: [] },
})

module.exports = mongoose.model('Resource', resourceSchema)
