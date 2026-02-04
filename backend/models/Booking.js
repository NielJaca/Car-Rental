const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  customerName: { type: String, required: true },
  contact: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalPrice: { type: Number, default: null },
  status: { type: String, default: 'pending', enum: ['pending', 'confirmed'] },
  source: { type: String, default: 'manual' },
  createdAt: { type: Date, default: Date.now }
});

bookingSchema.index({ createdAt: 1 });
bookingSchema.index({ carId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
