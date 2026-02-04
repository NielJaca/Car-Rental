require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const availabilityRoutes = require('./routes/availability');
const bookingsRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || (isProduction ? '' : 'http://localhost:5500');

if (isProduction && !FRONTEND_URL) {
  console.warn('FRONTEND_URL is not set in production. CORS may block requests.');
}

const corsOrigin = FRONTEND_URL ? FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean) : [];
app.use(cors({
  origin: corsOrigin.length ? corsOrigin : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'car-rental-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  },
};
const mongoUri = process.env.MONGODB_URI || '';
const isAtlasSql = /query\.mongodb\.net|atlas-sql/i.test(mongoUri);
if (isProduction && mongoUri && !isAtlasSql) {
  try {
    const MongoStore = require('connect-mongo');
    sessionConfig.store = MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 24 * 60 * 60,
    });
  } catch (err) {
    console.warn('connect-mongo not installed; sessions will use memory (run: npm install connect-mongo for production).');
  }
} else if (isProduction && isAtlasSql) {
  console.warn('MONGODB_URI looks like Atlas SQL / Data Federation. Use a DATABASE CLUSTER URI instead (Atlas → Connect → Connect your application). Sessions will use memory until fixed.');
}
app.use(session(sessionConfig));

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
