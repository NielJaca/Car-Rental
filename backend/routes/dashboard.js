const express = require('express');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const UnavailableDate = require('../models/UnavailableDate');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

function todayUTC() {
  const d = new Date();
  return { start: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)) };
}

router.get('/stats', async (req, res) => {
  try {
    const totalCars = await Car.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const now = new Date();
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const thisMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    const { start: todayStart, end: todayEnd } = todayUTC();
    const in7Days = new Date(todayStart);
    in7Days.setUTCDate(in7Days.getUTCDate() + 7);

    const [bookingsThisMonth, bookingsLastMonth, confirmedThisMonth, pendingThisMonth, unavailableTodayIds, revenueArr, avgArr, upcomingPickups, upcomingReturns] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      Booking.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      Booking.countDocuments({ status: 'confirmed', createdAt: { $gte: thisMonthStart } }),
      Booking.countDocuments({ status: 'pending', createdAt: { $gte: thisMonthStart } }),
      UnavailableDate.distinct('carId', { date: { $gte: todayStart, $lte: todayEnd } }),
      Booking.aggregate([{ $match: { status: 'confirmed', startDate: { $gte: thisMonthStart, $lte: thisMonthEnd } } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $project: { days: { $divide: [{ $subtract: ['$endDate', '$startDate'] }, 86400000] } } },
        { $group: { _id: null, avg: { $avg: '$days' } } },
      ]),
      Booking.countDocuments({ startDate: { $gte: todayStart, $lte: in7Days }, status: { $in: ['pending', 'confirmed'] } }),
      Booking.countDocuments({ endDate: { $gte: todayStart, $lte: in7Days }, status: { $in: ['pending', 'confirmed'] } }),
    ]);
    const revenueThisMonth = revenueArr[0] && typeof revenueArr[0].total === 'number' ? revenueArr[0].total : 0;
    const avgDuration = avgArr[0] && typeof avgArr[0].avg === 'number' ? avgArr[0].avg : 0;

    const unavailableToday = unavailableTodayIds.length;
    const availableToday = Math.max(0, totalCars - unavailableToday);

    let growthPercent = 0;
    if (bookingsLastMonth > 0) {
      growthPercent = ((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth * 100).toFixed(1);
    } else if (bookingsThisMonth > 0) {
      growthPercent = 100;
    }

    res.json({
      totalCars,
      totalBookings,
      bookingsThisMonth,
      confirmedThisMonth,
      pendingThisMonth,
      growthPercent: Number(growthPercent),
      availableToday,
      unavailableToday,
      upcomingPickups,
      upcomingReturns,
      revenueThisMonth: Number(revenueThisMonth),
      avgBookingDurationDays: Number(avgDuration.toFixed(1)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/charts/monthly-bookings', async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    const counts = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = await Booking.countDocuments({ createdAt: { $gte: start, $lte: end } });
      months.push(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);
      counts.push(count);
    }
    res.json({ labels: months, data: counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/charts/booking-growth', async (req, res) => {
  try {
    const now = new Date();
    const labels = [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = await Booking.countDocuments({ createdAt: { $gte: start, $lte: end } });
      labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      data.push(count);
    }
    res.json({ labels, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/charts/most-rented-cars', async (req, res) => {
  try {
    const agg = await Booking.aggregate([
      { $group: { _id: '$carId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'cars', localField: '_id', foreignField: '_id', as: 'car' } },
      { $unwind: '$car' },
      { $project: { name: '$car.name', count: 1, _id: 0 } }
    ]);
    res.json({ labels: agg.map((a) => a.name), data: agg.map((a) => a.count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/charts/monthly-bookings-by-status', async (req, res) => {
  try {
    const now = new Date();
    const labels = [];
    const pending = [];
    const confirmed = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const [p, c] = await Promise.all([
        Booking.countDocuments({ status: 'pending', createdAt: { $gte: start, $lte: end } }),
        Booking.countDocuments({ status: 'confirmed', createdAt: { $gte: start, $lte: end } }),
      ]);
      labels.push(`${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`);
      pending.push(p);
      confirmed.push(c);
    }
    res.json({ labels, pending, confirmed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/charts/monthly-revenue', async (req, res) => {
  try {
    const now = new Date();
    const labels = [];
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const result = await Booking.aggregate([
        { $match: { status: 'confirmed', startDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]);
      labels.push(`${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`);
      data.push(result[0]?.total ?? 0);
    }
    res.json({ labels, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming-bookings', async (req, res) => {
  try {
    const { start: todayStart } = todayUTC();
    const in14Days = new Date(todayStart);
    in14Days.setUTCDate(in14Days.getUTCDate() + 14);
    const list = await Booking.find({
      startDate: { $gte: todayStart, $lte: in14Days },
      status: { $in: ['pending', 'confirmed'] },
    })
      .populate('carId', 'name pricePerDay')
      .sort({ startDate: 1 })
      .limit(20)
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming-returns', async (req, res) => {
  try {
    const { start: todayStart } = todayUTC();
    const in14Days = new Date(todayStart);
    in14Days.setUTCDate(in14Days.getUTCDate() + 14);
    const list = await Booking.find({
      endDate: { $gte: todayStart, $lte: in14Days },
      status: { $in: ['pending', 'confirmed'] },
    })
      .populate('carId', 'name pricePerDay')
      .sort({ endDate: 1 })
      .limit(20)
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent-bookings', async (req, res) => {
  try {
    const list = await Booking.find({})
      .populate('carId', 'name pricePerDay')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
