const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  capacity: { type: Number },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);