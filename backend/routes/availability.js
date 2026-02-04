const express = require('express');
const UnavailableDate = require('../models/UnavailableDate');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/** Get all dates between start and end (inclusive) at UTC midnight. */
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

/** GET /api/availability/check - for booking form: is this car free for the date range? */
router.get('/check', async (req, res) => {
  try {
    const { carId, startDate, endDate, excludeBookingId, currentStartDate, currentEndDate } = req.query;
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({ error: 'carId, startDate, endDate required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.json({ available: true });
    }
    if (excludeBookingId && currentStartDate && currentEndDate) {
      const sameRange =
        currentStartDate === startDate && currentEndDate === endDate;
      if (sameRange) {
        return res.json({ available: true });
      }
    }
    const dates = getDateRange(start, end);
    const query = { carId, date: { $in: dates } };
    if (excludeBookingId) {
      query.$or = [{ bookingId: null }, { bookingId: { $ne: excludeBookingId } }];
    }
    const existing = await UnavailableDate.findOne(query).lean();
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { carId, year, month } = req.query;
    if (!carId || !year || !month) {
      return res.status(400).json({ error: 'carId, year, month required' });
    }
    const y = Number(year);
    const m = Number(month);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    const docs = await UnavailableDate.find({
      carId,
      date: { $gte: start, $lte: end }
    }).lean();
    const dates = docs.map((d) => {
      const d2 = new Date(d.date);
      return `${d2.getUTCFullYear()}-${String(d2.getUTCMonth() + 1).padStart(2, '0')}-${String(d2.getUTCDate()).padStart(2, '0')}`;
    });
    res.json({ dates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { carId, dates } = req.body;
    if (!carId || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'carId and dates array required' });
    }
    const toInsert = dates.map((d) => ({
      carId,
      date: new Date(d)
    }));
    await UnavailableDate.insertMany(toInsert).catch(() => {});
    const start = Math.min(...dates.map((d) => new Date(d).getTime()));
    const end = Math.max(...dates.map((d) => new Date(d).getTime()));
    const docs = await UnavailableDate.find({ carId, date: { $gte: new Date(start), $lte: new Date(end) } });
    res.json({ added: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', requireAdmin, async (req, res) => {
  try {
    const { carId, dates } = req.body;
    if (!carId || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'carId and dates array required' });
    }
    const result = await UnavailableDate.deleteMany({
      carId,
      date: { $in: dates.map((d) => new Date(d)) }
    });
    res.json({ removed: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
