require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const availabilityRoutes = require('./routes/availability');
const bookingsRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

(async () => {
  const mongoUri = await connectDB.getResolvedUri();
  await connectDB(mongoUri);

  const app = express();
  const PORT = process.env.PORT || 3000;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
  const allowedOrigins = FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, origin);
      try {
        const reqHost = new URL(origin).hostname;
        const match = allowedOrigins.find((o) => new URL(o).hostname === reqHost);
        if (match) return cb(null, origin);
      } catch (_) {}
      cb(null, false);
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const isProduction = process.env.NODE_ENV === 'production';
  app.use(session({
    secret: process.env.SESSION_SECRET || 'car-rental-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 hours
    }),
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: isProduction  // false in dev so cookie works over http://localhost
  }
  }));

  app.use('/api/auth', authRoutes);
  app.use('/api/cars', carsRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportsRoutes);

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
