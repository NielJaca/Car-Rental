const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  pricePerDay: { type: Number, required: true },
  imageUrl: { type: String, default: '' }, // legacy single image
  imageUrls: { type: [String], default: [] }, // multiple images (uploaded)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Car', carSchema);
