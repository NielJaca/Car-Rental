const express = require('express');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const debugLogPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');

function debugLog(payload) {
  try {
    fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
    const line = JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) + '\n';
    fs.appendFileSync(debugLogPath, line, { flag: 'a' });
  } catch (_) {}
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const admin = await Admin.findOne({ username: (username || '').trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Username not found' });
    }
    if (!(await admin.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    req.session.adminId = admin._id.toString();
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      // #region agent log
      const cfg = req.app.locals.cookieConfig || {};
      debugLog({ hypothesisId: 'H1,H2,H3,H5', location: 'auth.js:login-success', message: 'Login succeeded', data: { origin: req.get('origin') || 'none', host: req.get('host'), forwardedProto: req.get('x-forwarded-proto'), referer: req.get('referer')?.slice(0, 80), cookieConfig: cfg } });
      // #endregion
      res.json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', requireAdmin, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout error' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: true });
});

/** Add another admin (only existing admins). */
router.post('/register', requireAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const u = (username || '').trim().toLowerCase();
    if (!u) return res.status(400).json({ error: 'Username is required' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await Admin.findOne({ username: u });
    if (existing) return res.status(400).json({ error: 'Username already taken' });
    await Admin.create({ username: u, password: String(password) });
    res.status(201).json({ success: true, message: 'Admin created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
