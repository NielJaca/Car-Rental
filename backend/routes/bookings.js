const express = require('express');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const UnavailableDate = require('../models/UnavailableDate');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/** Generate all dates between start and end (inclusive), as Date objects at midnight. */
function getDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/** Check if any date in range is already unavailable for this car (optionally exclude one booking when editing). */
async function hasDateConflict(carId, startDate, endDate, excludeBookingId = null) {
  const dates = getDateRange(startDate, endDate);
  if (dates.length === 0) return false;
  const query = { carId, date: { $in: dates } };
  if (excludeBookingId) {
    query.$or = [{ bookingId: null }, { bookingId: { $ne: excludeBookingId } }];
  }
  const existing = await UnavailableDate.findOne(query).lean();
  return !!existing;
}

/** Mark a booking's date range as unavailable for the car (when status is confirmed). */
async function markBookingDatesUnavailable(carId, startDate, endDate, bookingId = null) {
  const dates = getDateRange(startDate, endDate);
  if (dates.length === 0) return;
  const docs = dates.map((date) => ({ carId, date, reason: 'booking', bookingId }));
  await UnavailableDate.insertMany(docs, { ordered: false }).catch(() => {});
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('carId', 'name pricePerDay')
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { carId, customerName, contact, startDate, endDate, totalPrice, status } = req.body;
    if (!carId || !customerName || !startDate || !endDate) {
      return res.status(400).json({ error: 'carId, customerName, startDate, endDate required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ error: 'End date must be on or after start date.' });
    }
    const conflict = await hasDateConflict(carId, start, end);
    if (conflict) {
      return res.status(400).json({ error: 'One or more dates in this range are already booked or unavailable for this car. Please choose different dates.' });
    }
    const booking = await Booking.create({
      carId,
      customerName,
      contact: contact || '',
      startDate: start,
      endDate: end,
      totalPrice: totalPrice != null ? Number(totalPrice) : null,
      status: status || 'pending',
      source: 'manual'
    });
    if (booking.status === 'confirmed') {
      await markBookingDatesUnavailable(booking.carId, start, end, booking._id);
    }
    const populated = await Booking.findById(booking._id).populate('carId', 'name pricePerDay');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { customerName, contact, startDate, endDate, totalPrice, status } = req.body;
    const update = {};
    if (customerName != null) update.customerName = customerName;
    if (contact != null) update.contact = contact;
    if (startDate != null) update.startDate = new Date(startDate);
    if (endDate != null) update.endDate = new Date(endDate);
    if (totalPrice != null) update.totalPrice = Number(totalPrice);
    if (status != null) update.status = status;
    const existing = await Booking.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    const start = update.startDate != null ? update.startDate : existing.startDate;
    const end = update.endDate != null ? update.endDate : existing.endDate;
    const carIdRaw = existing.carId && existing.carId._id ? existing.carId._id : existing.carId;
    const existingStart = existing.startDate ? new Date(existing.startDate).getTime() : null;
    const existingEnd = existing.endDate ? new Date(existing.endDate).getTime() : null;
    const rangeChanged = existingStart !== new Date(start).getTime() || existingEnd !== new Date(end).getTime();
    if (rangeChanged && start && end && new Date(end) >= new Date(start)) {
      const conflict = await hasDateConflict(carIdRaw, start, end, req.params.id);
      if (conflict) {
        return res.status(400).json({ error: 'One or more dates in this range are already booked or unavailable for this car. Please choose different dates.' });
      }
    }
    const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('carId', 'name pricePerDay');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'confirmed' && booking.startDate && booking.endDate) {
      const carIdForMark = booking.carId && booking.carId._id ? booking.carId._id : booking.carId;
      await markBookingDatesUnavailable(carIdForMark, booking.startDate, booking.endDate, booking._id);
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
