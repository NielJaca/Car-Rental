const express = require('express');
const Admin = require('../models/Admin');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const admin = await Admin.findOne({ username: (username || '').trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username' });
    }
    if (!(await admin.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    req.session.adminId = admin._id.toString();
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
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
