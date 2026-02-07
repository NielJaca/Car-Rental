require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const { requireAdmin, setTokenValidator } = require('./middleware/auth');
const carsRoutes = require('./routes/cars');
const availabilityRoutes = require('./routes/availability');
const bookingsRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

(async () => {
  const mongoUri = await connectDB.getResolvedUri();
  await connectDB(mongoUri);

  const app = express();
  app.set('trust proxy', 1);

  const PORT = process.env.PORT || 3000;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';
  const allowedOrigins = FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const originNorm = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(originNorm)) return cb(null, origin);
      try {
        const reqHost = new URL(origin).hostname;
        const match = allowedOrigins.find((o) => {
          try {
            return new URL(o).hostname === reqHost;
          } catch { return false; }
        });
        if (match) return cb(null, origin);
      } catch (_) {}
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = allowedOrigins[0] || '';
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  const serveFrontend = require('fs').existsSync(frontendDist);
  const isCrossOrigin = !serveFrontend && frontendUrl.startsWith('https://') && !frontendUrl.includes('localhost');
  // Same-origin: omit SameSite (browser default) for better Safari mobile compatibility. Cross-origin: SameSite=None; Secure.
  const cookieOpts = {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProduction || isCrossOrigin,
    ...(isCrossOrigin ? { sameSite: 'none' } : {}),
  };
  app.locals.cookieConfig = { isProduction, isCrossOrigin, serveFrontend, cookieOpts };

  console.log('[session] serveFrontend=%s isCrossOrigin=%s secure=%s sameSite=%s', serveFrontend, isCrossOrigin, cookieOpts.secure, cookieOpts.sameSite || '(omit)');

  app.use(session({
    secret: process.env.SESSION_SECRET || 'car-rental-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 hours
    }),
    cookie: cookieOpts,
  }));

  setTokenValidator(authRoutes.validateAdminToken || (() => null));
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

  if (serveFrontend) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
