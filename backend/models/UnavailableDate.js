const mongoose = require('mongoose');

const unavailableDateSchema = new mongoose.Schema({
  carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  date: { type: Date, required: true },
  reason: { type: String, default: '' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null }
});

unavailableDateSchema.index({ carId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UnavailableDate', unavailableDateSchema);
