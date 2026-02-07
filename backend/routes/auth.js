const crypto = require('crypto');
const express = require('express');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const debugLogPath = path.join(process.cwd(), '.cursor', 'debug.log');
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const adminTokens = new Map();

function debugLog(payload) {
  try {
    fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
    const line = JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) + '\n';
    fs.appendFileSync(debugLogPath, line, { flag: 'a' });
  } catch (_) {}
}

function createAdminToken(adminId) {
  const token = crypto.randomBytes(32).toString('hex');
  adminTokens.set(token, { adminId, expires: Date.now() + TOKEN_TTL_MS });
  return token;
}

function validateAdminToken(token) {
  if (!token) return null;
  const entry = adminTokens.get(token);
  if (!entry || entry.expires < Date.now()) {
    if (entry) adminTokens.delete(token);
    return null;
  }
  return entry.adminId;
}

function removeAdminToken(token) {
  adminTokens.delete(token);
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
    const adminId = admin._id.toString();
    req.session.adminId = adminId;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      const token = createAdminToken(adminId);
      // #region agent log
      const cfg = req.app.locals?.cookieConfig || {};
      const d = { origin: req.get('origin') || 'none', host: req.get('host'), forwardedProto: req.get('x-forwarded-proto'), userAgent: req.get('user-agent')?.slice(0, 60), cookieConfig: cfg };
      debugLog({ hypothesisId: 'H1,H2,H3,H5', location: 'auth.js:login-success', message: 'Login succeeded', data: d });
      console.log('[session] login ok', d.origin, d.host, d.forwardedProto);
      // #endregion
      res.json({ success: true, token });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  const auth = req.get('authorization');
  const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (bearer) removeAdminToken(bearer);
  if (req.session && req.session.adminId) {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Logout error' });
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
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
module.exports.validateAdminToken = validateAdminToken;
